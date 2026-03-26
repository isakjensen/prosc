import * as cheerio from "cheerio";

export interface SearchResult {
	url: string;
	title: string;
	snippet: string;
}

const DIRECTORY_DOMAINS = [
	"facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
	"linkedin.com", "youtube.com", "tiktok.com",
	"google.com", "maps.google", "goo.gl",
	"tripadvisor", "yelp.com", "foursquare.com",
	"hitta.se", "eniro.se", "gulasidorna.se", "ratsit.se", "allabolag.se",
	"bokadirekt.se", "thefork.com", "just-eat.se", "foodora.se", "wolt.com",
	"wikipedia.org", "wikimedia.org",
	"mittanbud.se", "hittahantverkare.se",
	"happycow.net", "foodguide.se", "restaurantguru.com", "dkmap.net",
	"zomato.com", "opentable.com",
];

function isDirectory(url: string): boolean {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		return DIRECTORY_DOMAINS.some((d) => hostname.includes(d));
	} catch {
		return true;
	}
}

function extractUrl(href: string): string | null {
	try {
		// DuckDuckGo wraps URLs som: //duckduckgo.com/l/?uddg=<encoded>&rut=...
		// eller /l/?uddg=<encoded>&rut=...
		let fullHref = href;
		if (href.startsWith("//")) fullHref = "https:" + href;
		else if (href.startsWith("/")) fullHref = "https://duckduckgo.com" + href;

		const parsed = new URL(fullHref);

		// Hoppa över annonser (y.js)
		if (parsed.pathname.includes("y.js")) return null;

		const uddg = parsed.searchParams.get("uddg");
		if (uddg) return decodeURIComponent(uddg);

		// Om det är en direkt URL (inte redirect)
		if (!parsed.hostname.includes("duckduckgo.com")) return parsed.href;

		return null;
	} catch {
		return null;
	}
}

export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
	const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=se-sv`;

	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
			"Accept-Language": "sv-SE,sv;q=0.9",
		},
	});

	if (!res.ok) throw new Error(`DuckDuckGo svarade med ${res.status}`);

	const html = await res.text();
	const $ = cheerio.load(html);
	const results: SearchResult[] = [];

	$(".result").each((_, el) => {
		const linkEl = $(el).find(".result__a");
		const snippetEl = $(el).find(".result__snippet");

		const rawHref = linkEl.attr("href") ?? "";
		const finalUrl = extractUrl(rawHref);

		if (!finalUrl) return;
		if (isDirectory(finalUrl)) return;

		const title = linkEl.text().trim();
		const snippet = snippetEl.text().trim();

		if (title) {
			results.push({ url: finalUrl, title, snippet });
		}
	});

	return results.slice(0, 5);
}
