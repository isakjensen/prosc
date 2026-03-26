import * as cheerio from "cheerio";

export interface SearchResult {
	url: string;
	title: string;
	snippet: string;
	source: "organic" | "directory";
}

export interface MultiSearchResult {
	organic: SearchResult[]; // Potentiella egna hemsidor
	directories: SearchResult[]; // Resultat från kataloger (hitta.se, eniro, etc.)
	allabolagUrl: string | null; // Direkt-URL till allabolag.se om hittad
}

const DIRECTORY_DOMAINS = [
	"facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
	"linkedin.com", "youtube.com", "tiktok.com",
	"google.com", "maps.google", "goo.gl",
	"tripadvisor", "yelp.com", "foursquare.com",
	"hitta.se", "eniro.se", "gulasidorna.se", "ratsit.se",
	"bokadirekt.se", "thefork.com", "just-eat.se", "foodora.se", "wolt.com",
	"wikipedia.org", "wikimedia.org",
	"mittanbud.se", "hittahantverkare.se",
	"happycow.net", "foodguide.se", "restaurantguru.com", "dkmap.net",
	"zomato.com", "opentable.com",
];

// Kataloger vars data vi vill behålla (men separera)
const USEFUL_DIRECTORY_DOMAINS = [
	"hitta.se", "eniro.se", "bokadirekt.se", "linkedin.com",
];

function classifyUrl(url: string): "organic" | "allabolag" | "useful_directory" | "skip_directory" {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		if (hostname.includes("allabolag.se")) return "allabolag";
		if (USEFUL_DIRECTORY_DOMAINS.some((d) => hostname.includes(d))) return "useful_directory";
		if (DIRECTORY_DOMAINS.some((d) => hostname.includes(d))) return "skip_directory";
		return "organic";
	} catch {
		return "skip_directory";
	}
}

function extractUrl(href: string): string | null {
	try {
		let fullHref = href;
		if (href.startsWith("//")) fullHref = "https:" + href;
		else if (href.startsWith("/")) fullHref = "https://duckduckgo.com" + href;

		const parsed = new URL(fullHref);

		if (parsed.pathname.includes("y.js")) return null;

		const uddg = parsed.searchParams.get("uddg");
		if (uddg) return decodeURIComponent(uddg);

		if (!parsed.hostname.includes("duckduckgo.com")) return parsed.href;

		return null;
	} catch {
		return null;
	}
}

async function searchDuckDuckGoRaw(query: string): Promise<Array<{ url: string; title: string; snippet: string }>> {
	const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=se-sv`;

	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
			"Accept-Language": "sv-SE,sv;q=0.9",
		},
		signal: AbortSignal.timeout(10000),
	});

	if (!res.ok) throw new Error(`DuckDuckGo svarade med ${res.status}`);

	const html = await res.text();
	const $ = cheerio.load(html);
	const results: Array<{ url: string; title: string; snippet: string }> = [];

	$(".result").each((_, el) => {
		const linkEl = $(el).find(".result__a");
		const snippetEl = $(el).find(".result__snippet");

		const rawHref = linkEl.attr("href") ?? "";
		const finalUrl = extractUrl(rawHref);
		if (!finalUrl) return;

		const title = linkEl.text().trim();
		const snippet = snippetEl.text().trim();

		if (title) {
			results.push({ url: finalUrl, title, snippet });
		}
	});

	return results;
}

/**
 * Kör flera sökningar parallellt för att hitta maximalt med info om ett företag.
 * - Sökning 1: "företagsnamn stad" (huvudsökning)
 * - Sökning 2: "företagsnamn hemsida" (hitta potentiell hemsida)
 * - Sökning 3: "företagsnamn stad recension/omdöme" (hitta recensionsdata)
 */
export async function searchBusiness(
	businessName: string,
	city: string,
): Promise<MultiSearchResult> {
	const result: MultiSearchResult = {
		organic: [],
		directories: [],
		allabolagUrl: null,
	};

	const seenUrls = new Set<string>();

	const queries = [
		`"${businessName}" ${city}`,
		`"${businessName}" hemsida`,
		`site:allabolag.se "${businessName}" ${city}`,
	];

	console.log(`  [Sökning] Kör ${queries.length} sökningar för "${businessName}"...`);

	// Kör sökningarna med kort delay mellan (undvik rate limiting)
	const allRaw: Array<{ url: string; title: string; snippet: string }> = [];

	for (let i = 0; i < queries.length; i++) {
		try {
			const results = await searchDuckDuckGoRaw(queries[i]);
			allRaw.push(...results);
			console.log(`  [Sökning] "${queries[i]}" → ${results.length} träffar`);
		} catch (err) {
			console.warn(`  [Sökning] "${queries[i]}" misslyckades: ${err}`);
		}
		// Kort delay mellan sökningar
		if (i < queries.length - 1) {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	// Klassificera och deduplicera
	for (const r of allRaw) {
		// Normalisera URL (ta bort trailing slash, fragment)
		let normalUrl: string;
		try {
			const u = new URL(r.url);
			u.hash = "";
			normalUrl = u.href.replace(/\/+$/, "");
		} catch {
			continue;
		}

		if (seenUrls.has(normalUrl)) continue;
		seenUrls.add(normalUrl);

		const classification = classifyUrl(r.url);

		if (classification === "allabolag") {
			if (!result.allabolagUrl) result.allabolagUrl = r.url;
		} else if (classification === "organic") {
			result.organic.push({ ...r, source: "organic" });
		} else if (classification === "useful_directory") {
			result.directories.push({ ...r, source: "directory" });
		}
		// skip_directory: kastas
	}

	// Begränsa antal
	result.organic = result.organic.slice(0, 8);
	result.directories = result.directories.slice(0, 5);

	console.log(
		`  [Sökning] Resultat: ${result.organic.length} organiska, ${result.directories.length} kataloger, allabolag=${result.allabolagUrl ? "ja" : "nej"}`,
	);

	return result;
}

// Behåll enkel sökning för bakåtkompatibilitet
export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
	const raw = await searchDuckDuckGoRaw(query);
	return raw
		.filter((r) => classifyUrl(r.url) === "organic")
		.map((r) => ({ ...r, source: "organic" as const }))
		.slice(0, 5);
}
