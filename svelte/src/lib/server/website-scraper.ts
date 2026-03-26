import * as cheerio from "cheerio";

export interface ScrapedWebsite {
	url: string;
	title: string | null;
	description: string | null;
	hasContactInfo: boolean;
	looksLegit: boolean;
}

const PHONE_RE = /(\+46|0)[\s\-]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/;

export async function scrapeWebsite(url: string): Promise<ScrapedWebsite> {
	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
		},
		signal: AbortSignal.timeout(8000),
	});

	if (!res.ok) {
		return { url, title: null, description: null, hasContactInfo: false, looksLegit: false };
	}

	const contentType = res.headers.get("content-type") ?? "";
	if (!contentType.includes("text/html")) {
		return { url, title: null, description: null, hasContactInfo: false, looksLegit: false };
	}

	const html = await res.text();
	const $ = cheerio.load(html);

	const title = $("title").first().text().trim() || null;
	const description =
		$('meta[name="description"]').attr("content")?.trim() ||
		$('meta[property="og:description"]').attr("content")?.trim() ||
		null;

	const bodyText = $("body").text();
	const hasPhone = PHONE_RE.test(bodyText);
	const hasAddress = /gatan|vägen|torget|torg|allén|plan\b/i.test(bodyText);
	const hasContactInfo = hasPhone || hasAddress;

	// Lookslegit: har titel, mer än 200 tecken text, inte bara en felsida
	const looksLegit =
		!!title &&
		bodyText.length > 200 &&
		!/(404|not found|page not found|sidan hittades inte)/i.test(title);

	return { url, title, description, hasContactInfo, looksLegit };
}
