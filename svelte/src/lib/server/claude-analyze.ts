import { spawn } from "child_process";
import { searchDuckDuckGo } from "./web-search";
import { scrapeWebsite } from "./website-scraper";

export interface BusinessInfo {
	businessName: string;
	category: string | null;
	address: string | null;
	phone: string | null;
	hasWebsite: boolean;
	website: string | null;
}

export interface AnalysisResult {
	summary: string;
	priority: "Hög" | "Medel" | "Låg";
	websiteFound: string | null;
	promptUsed: string;
}

function runClaude(prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const cmd = "C:\\Users\\isakl\\.local\\bin\\claude.exe";

		const proc = spawn(
			cmd,
			["--print", "--model", "haiku", "--input-format", "text", "--output-format", "text"],
			{ shell: false, stdio: ["pipe", "pipe", "pipe"] }
		);

		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (d) => (stdout += d.toString()));
		proc.stderr.on("data", (d) => (stderr += d.toString()));

		proc.stdin!.write(prompt, "utf8");
		proc.stdin!.end();

		const timer = setTimeout(() => {
			proc.kill();
			reject(new Error("Claude timeout efter 30s"));
		}, 30000);

		proc.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) resolve(stdout.trim());
			else reject(new Error(stderr.trim() || `claude avslutades med kod ${code}`));
		});

		proc.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

export async function analyzeProspect(
	business: BusinessInfo,
	logPrefix: string,
	cityName?: string
): Promise<AnalysisResult> {
	// Prioritera cityName från pipeline, annars försök extrahera ur adressen
	const city = cityName ?? business.address?.split(",").filter(p => !/^\d/.test(p.trim())).pop()?.trim() ?? "";
	const searchQuery = `"${business.businessName}" ${city}`.trim();

	// --- Steg 1: DuckDuckGo-sökning ---
	console.log(`${logPrefix}   → Söker: ${searchQuery}`);
	let searchResults: Awaited<ReturnType<typeof searchDuckDuckGo>> = [];
	try {
		searchResults = await searchDuckDuckGo(searchQuery);
		console.log(`${logPrefix}   → ${searchResults.length} sökträffar (efter filtrering)`);
	} catch (err) {
		console.warn(`${logPrefix}   → Sökning misslyckades: ${err}`);
	}

	// --- Steg 2: Välj bästa kandidat att scrapa ---
	// Prioritera sökträff vars titel/snippet nämner företagsnamnet
	let scrapedSite: Awaited<ReturnType<typeof scrapeWebsite>> | null = null;
	let bestUrl: string | null = null;

	if (searchResults.length > 0) {
		const nameParts = business.businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
		const scored = searchResults.map((r, i) => {
			const text = `${r.title} ${r.snippet}`.toLowerCase();
			const matches = nameParts.filter(part => text.includes(part)).length;
			return { r, i, score: matches };
		});
		// Välj träff med högst namnmatchning; bland lika poäng föredras lägre index
		scored.sort((a, b) => b.score - a.score || a.i - b.i);
		bestUrl = scored[0].r.url;
		const chosenIdx = scored[0].i + 1;
		console.log(`${logPrefix}   → Scrapar träff #${chosenIdx} (score=${scored[0].score}): ${bestUrl}`);
		try {
			scrapedSite = await scrapeWebsite(bestUrl);
			console.log(
				`${logPrefix}   → Scrapad: "${scrapedSite.title}" | legitim=${scrapedSite.looksLegit} | kontaktinfo=${scrapedSite.hasContactInfo}`
			);
		} catch (err) {
			console.warn(`${logPrefix}   → Scraping misslyckades: ${err}`);
			// Fallback: prova första träffen om den inte redan valdes
			if (chosenIdx !== 1 && searchResults[0].url !== bestUrl) {
				bestUrl = searchResults[0].url;
				console.log(`${logPrefix}   → Fallback scrapar #1: ${bestUrl}`);
				try {
					scrapedSite = await scrapeWebsite(bestUrl);
				} catch {
					// ge upp
				}
			}
		}
	}

	// --- Steg 3: Bygg prompt med all insamlad data ---
	const searchSection =
		searchResults.length > 0
			? searchResults
					.map((r, i) => `  ${i + 1}. ${r.title}\n     URL: ${r.url}\n     Utdrag: ${r.snippet}`)
					.join("\n")
			: "  Inga träffar hittades.";

	const scrapeSection = scrapedSite
		? `Titel: ${scrapedSite.title ?? "—"}
Beskrivning: ${scrapedSite.description ?? "—"}
Har kontaktinfo (tel/adress): ${scrapedSite.hasContactInfo ? "Ja" : "Nej"}
Ser legitim ut: ${scrapedSite.looksLegit ? "Ja" : "Nej"}
URL: ${scrapedSite.url}`
		: "Ingen sida scrapades.";

	const prompt = `Du är säljassistent på en webbutvecklingsbyrå. Analysera om detta svenska företag är ett bra prospekt för en ny eller förbättrad hemsida.

=== FÖRETAGSDATA (från OSM) ===
Namn: ${business.businessName}
Kategori: ${business.category ?? "okänd"}
Adress: ${business.address ?? "okänd"}
Telefon: ${business.phone ?? "saknas"}
Hemsida registrerad i OSM: ${business.hasWebsite ? `Ja (${business.website})` : "Nej"}

=== SÖKRESULTAT FRÅN DUCKDUCKGO ===
Sökte på: "${searchQuery}"
${searchSection}

=== SCRAPAD WEBBPLATS (mest relevant träff) ===
${scrapeSection}

=== UPPGIFT ===
Baserat på ALL ovanstående data:
1. Har företaget troligtvis en fungerande hemsida? (om ja, vilken URL?)
2. Behöver de en ny eller förbättrad hemsida?
3. Hur hög prioritet är de som prospekt?

Svara EXAKT i detta format:
ANALYS: [2-3 meningar om deras digitala närvaro och potential som kund]
PRIORITET: [Hög/Medel/Låg]
HEMSIDA_HITTAD: [URL om hittad, annars "Ingen"]`;

	// --- Steg 4: Claude-analys ---
	console.log(`${logPrefix}   → Skickar till Claude Haiku...`);
	const raw = await runClaude(prompt);
	console.log(`${logPrefix}   → Råsvar: ${raw.slice(0, 100)}...`);

	const summaryMatch = raw.match(/ANALYS:\s*(.+?)(?=\nPRIORITET:|$)/s);
	const priorityMatch = raw.match(/PRIORITET:\s*(Hög|Medel|Låg)/);
	const websiteMatch = raw.match(/HEMSIDA_HITTAD:\s*(.+)/);
	const websiteRaw = websiteMatch?.[1]?.trim();
	const websiteFound = websiteRaw && websiteRaw.toLowerCase() !== "ingen" ? websiteRaw : null;

	return {
		summary: summaryMatch?.[1]?.trim() ?? raw,
		priority: (priorityMatch?.[1] as "Hög" | "Medel" | "Låg") ?? "Medel",
		websiteFound,
		promptUsed: prompt,
	};
}
