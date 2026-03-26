import { spawn } from "child_process";
import { searchBusiness, type MultiSearchResult } from "./web-search";
import { scrapeWebsite, type ScrapedWebsite } from "./website-scraper";
import { scrapeAllabolag, type AllabolagData } from "./allabolag";

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
	// Ny: all insamlad data sparas
	collectedData: CollectedData;
}

export interface CollectedData {
	allabolag: AllabolagData;
	searchResults: MultiSearchResult;
	scrapedSites: ScrapedWebsite[];
	ownWebsite: ScrapedWebsite | null;
}

function findClaude(): string {
	// Sök i vanliga platser
	const candidates = [
		"claude", // PATH (Linux/Mac)
		"claude.exe", // PATH (Windows)
		process.env.CLAUDE_PATH ?? "",
	];

	// Returnera första som finns, eller "claude" som default
	return candidates.find((c) => c.length > 0) ?? "claude";
}

function runClaude(prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const cmd = findClaude();

		const proc = spawn(
			cmd,
			["--print", "--model", "haiku", "--input-format", "text", "--output-format", "text"],
			{ shell: true, stdio: ["pipe", "pipe", "pipe"] },
		);

		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (d) => (stdout += d.toString()));
		proc.stderr.on("data", (d) => (stderr += d.toString()));

		proc.stdin!.write(prompt, "utf8");
		proc.stdin!.end();

		const timer = setTimeout(() => {
			proc.kill();
			reject(new Error("Claude timeout efter 60s"));
		}, 60000);

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

/**
 * Analysera ett prospekt med all tillgänglig data:
 * 1. Allabolag.se (bolagsdata: org.nr, omsättning, anställda)
 * 2. Multisökning (DuckDuckGo × 3 queries)
 * 3. Scrapa bästa organiska träffar + ev. befintlig hemsida
 * 4. Claude AI-analys med allt samlat
 */
export async function analyzeProspect(
	business: BusinessInfo,
	logPrefix: string,
	cityName?: string,
): Promise<AnalysisResult> {
	const city =
		cityName ??
		business.address
			?.split(",")
			.filter((p) => !/^\d/.test(p.trim()))
			.pop()
			?.trim() ??
		"";

	// === STEG 1: Allabolag.se ===
	console.log(`${logPrefix}   → Hämtar bolagsdata från Allabolag.se...`);
	let allabolagData: AllabolagData;
	try {
		allabolagData = await scrapeAllabolag(business.businessName, city);
	} catch (err) {
		console.warn(`${logPrefix}   → Allabolag misslyckades: ${err}`);
		allabolagData = { found: false, url: null, orgNr: null, companyName: null, companyType: null, sniCode: null, sniDescription: null, revenue: null, profit: null, employees: null, registeredYear: null, status: null, address: null, boardMembers: [] };
	}

	// === STEG 2: Multi-sökning ===
	console.log(`${logPrefix}   → Kör multi-sökning...`);
	let searchResults: MultiSearchResult;
	try {
		searchResults = await searchBusiness(business.businessName, city);
	} catch (err) {
		console.warn(`${logPrefix}   → Sökning misslyckades: ${err}`);
		searchResults = { organic: [], directories: [], allabolagUrl: null };
	}

	// === STEG 3: Scrapa topp-träffar ===
	const scrapedSites: ScrapedWebsite[] = [];
	let ownWebsite: ScrapedWebsite | null = null;

	// Scrapa befintlig hemsida om den finns (från OSM)
	if (business.website) {
		console.log(`${logPrefix}   → Scrapar OSM-hemsida: ${business.website}`);
		try {
			ownWebsite = await scrapeWebsite(business.website);
		} catch (err) {
			console.warn(`${logPrefix}   → OSM-hemsida misslyckades: ${err}`);
		}
	}

	// Poängsätt och scrapa topp organiska resultat
	if (searchResults.organic.length > 0) {
		const nameParts = business.businessName
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2);

		const scored = searchResults.organic.map((r, i) => {
			const text = `${r.title} ${r.snippet}`.toLowerCase();
			const matches = nameParts.filter((part) => text.includes(part)).length;
			return { r, i, score: matches };
		});
		scored.sort((a, b) => b.score - a.score || a.i - b.i);

		// Scrapa topp 3 träffar
		const toScrape = scored.slice(0, 3);
		for (const { r, score } of toScrape) {
			// Skippa om det är samma som OSM-hemsidan
			if (business.website && r.url.includes(new URL(business.website).hostname)) continue;

			console.log(`${logPrefix}   → Scrapar: ${r.url} (score=${score})`);
			try {
				const scraped = await scrapeWebsite(r.url);
				scrapedSites.push(scraped);
			} catch (err) {
				console.warn(`${logPrefix}   → Scraping misslyckades: ${r.url}: ${err}`);
			}
		}
	}

	// === STEG 4: Bygg rik prompt ===
	const prompt = buildPrompt(business, city, allabolagData, searchResults, scrapedSites, ownWebsite);

	// === STEG 5: Claude-analys ===
	console.log(`${logPrefix}   → Skickar till Claude Haiku (${prompt.length} tecken)...`);
	const raw = await runClaude(prompt);
	console.log(`${logPrefix}   → Råsvar: ${raw.slice(0, 120)}...`);

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
		collectedData: {
			allabolag: allabolagData,
			searchResults,
			scrapedSites,
			ownWebsite,
		},
	};
}

function buildPrompt(
	business: BusinessInfo,
	city: string,
	allabolag: AllabolagData,
	search: MultiSearchResult,
	scrapedSites: ScrapedWebsite[],
	ownWebsite: ScrapedWebsite | null,
): string {
	// --- Sektion 1: Företagsdata från OSM ---
	const osmSection = `Namn: ${business.businessName}
Kategori: ${business.category ?? "okänd"}
Adress: ${business.address ?? "okänd"}
Telefon: ${business.phone ?? "saknas"}
Hemsida registrerad i OSM: ${business.hasWebsite ? `Ja (${business.website})` : "Nej"}`;

	// --- Sektion 2: Allabolag.se ---
	let allabolagSection: string;
	if (allabolag.found) {
		const parts = [
			`Företagsnamn: ${allabolag.companyName ?? "—"}`,
			`Organisationsnummer: ${allabolag.orgNr ?? "—"}`,
			`Bolagsform: ${allabolag.companyType ?? "—"}`,
			`SNI-bransch: ${allabolag.sniDescription ?? allabolag.sniCode ?? "—"}`,
			`Omsättning: ${allabolag.revenue ?? "—"}`,
			`Resultat: ${allabolag.profit ?? "—"}`,
			`Antal anställda: ${allabolag.employees ?? "—"}`,
			`Registrerad: ${allabolag.registeredYear ?? "—"}`,
			`Status: ${allabolag.status ?? "—"}`,
			`Adress: ${allabolag.address ?? "—"}`,
		];
		if (allabolag.boardMembers.length > 0) {
			parts.push(`Styrelse/ägare: ${allabolag.boardMembers.join(", ")}`);
		}
		parts.push(`Källa: ${allabolag.url}`);
		allabolagSection = parts.join("\n");
	} else {
		allabolagSection = "Inget bolag hittades på Allabolag.se. Kan vara enskild firma utan registrerad omsättning.";
	}

	// --- Sektion 3: Sökresultat ---
	const organicSection =
		search.organic.length > 0
			? search.organic
					.slice(0, 6)
					.map(
						(r, i) =>
							`  ${i + 1}. ${r.title}\n     URL: ${r.url}\n     Utdrag: ${r.snippet}`,
					)
					.join("\n")
			: "  Inga organiska träffar (= sannolikt ingen egen hemsida).";

	const directorySection =
		search.directories.length > 0
			? search.directories
					.map((r) => `  • ${r.title} (${r.url})`)
					.join("\n")
			: "  Inga katalogträffar.";

	// --- Sektion 4: Scrapad befintlig hemsida ---
	let ownWebsiteSection: string;
	if (ownWebsite && ownWebsite.looksLegit) {
		const socialList = Object.entries(ownWebsite.socialMedia)
			.filter(([, v]) => v)
			.map(([k, v]) => `${k}: ${v}`)
			.join(", ");

		ownWebsiteSection = `URL: ${ownWebsite.url}
Titel: ${ownWebsite.title ?? "—"}
Beskrivning: ${ownWebsite.description ?? "—"}
SSL (HTTPS): ${ownWebsite.hasSSL ? "Ja" : "Nej"}
Mobilanpassad (viewport): ${ownWebsite.isMobileResponsive ? "Ja" : "Nej"}
Teknik: ${ownWebsite.techHints.length > 0 ? ownWebsite.techHints.join(", ") : "okänd"}
Uppskattad sidstorlek: ${ownWebsite.pageCount ? `~${ownWebsite.pageCount} interna länkar` : "okänt"}
Copyright/senast uppdaterad: ${ownWebsite.lastModifiedHint ?? "okänt"}
Kontaktinfo på sidan: ${ownWebsite.hasContactInfo ? "Ja" : "Nej"}
E-post: ${ownWebsite.emails.length > 0 ? ownWebsite.emails.join(", ") : "ej hittad"}
Telefon: ${ownWebsite.phones.length > 0 ? ownWebsite.phones.join(", ") : "ej hittad"}
Sociala medier: ${socialList || "inga hittade"}`;
	} else if (ownWebsite) {
		ownWebsiteSection = `URL: ${ownWebsite.url}\nSidan verkar inte fungera korrekt (404/tom/icke-legitimt innehåll).`;
	} else {
		ownWebsiteSection = "Ingen hemsida registrerad eller kunde inte laddas.";
	}

	// --- Sektion 5: Scrapad potentiella hemsidor ---
	let scrapedSection: string;
	if (scrapedSites.length > 0) {
		scrapedSection = scrapedSites
			.map((s, i) => {
				const socialList = Object.entries(s.socialMedia)
					.filter(([, v]) => v)
					.map(([k]) => k)
					.join(", ");
				return `  Sida ${i + 1}: ${s.url}
    Titel: ${s.title ?? "—"}
    Beskrivning: ${s.description ?? "—"}
    Legitim: ${s.looksLegit ? "Ja" : "Nej"} | Kontaktinfo: ${s.hasContactInfo ? "Ja" : "Nej"}
    Teknik: ${s.techHints.length > 0 ? s.techHints.join(", ") : "—"} | Mobil: ${s.isMobileResponsive ? "Ja" : "Nej"}
    Sociala medier: ${socialList || "inga"}`;
			})
			.join("\n");
	} else {
		scrapedSection = "  Inga potentiella hemsidor kunde scrapas.";
	}

	return `Du är en erfaren säljanalytiker på en webbutvecklingsbyrå i Sverige. Du ska analysera om detta företag är ett bra prospekt att kontakta för att sälja webbplatstjänster (ny hemsida, redesign, SEO, etc.).

Du har tillgång till data från FYRA källor. Analysera ALL data noggrant.

=== 1. FÖRETAGSDATA FRÅN OPENSTREETMAP ===
${osmSection}

=== 2. BOLAGSDATA FRÅN ALLABOLAG.SE ===
${allabolagSection}

=== 3. SÖKRESULTAT (DuckDuckGo, 3 sökningar) ===
Organiska träffar (potentiella hemsidor):
${organicSection}

Kataloglistningar (Hitta.se, Eniro, etc.):
${directorySection}

=== 4. SCRAPAD BEFINTLIG HEMSIDA ===
${ownWebsiteSection}

=== 5. ANDRA SCRAPADE SIDOR (från sökresultat) ===
${scrapedSection}

=== UPPGIFT ===
Analysera ALL ovanstående data och bedöm:

1. **Digital närvaro**: Har företaget en fungerande hemsida? Hur bra är den? (teknik, mobil, SSL, innehåll)
2. **Företagsstorlek**: Baserat på Allabolag-data (omsättning, anställda) - har de råd med en hemsida?
3. **Behov**: Behöver de en ny/förbättrad hemsida? Varför?
4. **Potential**: Hur sannolikt är det att de skulle köpa webbtjänster?
5. **Hemsida**: Om du hittade en hemsida som INTE var registrerad i OSM, ange URL:en

Svara EXAKT i detta format (inget annat):
ANALYS: [3-5 meningar: sammanfatta digital närvaro, bolagsstorlek, behov och potential som kund. Var specifik med siffror från Allabolag om tillgängligt.]
PRIORITET: [Hög/Medel/Låg]
HEMSIDA_HITTAD: [URL om hittad utanför OSM, annars "Ingen"]`;
}
