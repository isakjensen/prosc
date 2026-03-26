import * as cheerio from "cheerio";

export interface ScrapedWebsite {
	url: string;
	title: string | null;
	description: string | null;
	hasContactInfo: boolean;
	looksLegit: boolean;
	// Nya fält
	socialMedia: SocialMediaLinks;
	techHints: string[]; // WordPress, Wix, Squarespace, etc.
	isMobileResponsive: boolean;
	hasSSL: boolean;
	pageCount: number | null; // Antal interna links (indikerar sidstorlek)
	lastModifiedHint: string | null; // Copyright-år eller liknande
	emails: string[];
	phones: string[];
}

export interface SocialMediaLinks {
	facebook: string | null;
	instagram: string | null;
	linkedin: string | null;
	twitter: string | null;
	youtube: string | null;
	tiktok: string | null;
}

const PHONE_RE = /(\+46|0)[\s\-]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const TECH_SIGNATURES: Array<{ name: string; patterns: RegExp[] }> = [
	{ name: "WordPress", patterns: [/wp-content/i, /wp-includes/i, /wordpress/i] },
	{ name: "Wix", patterns: [/wix\.com/i, /wixsite\.com/i, /_wix_/i] },
	{ name: "Squarespace", patterns: [/squarespace/i, /sqsp\.net/i] },
	{ name: "Shopify", patterns: [/shopify/i, /cdn\.shopify/i] },
	{ name: "Webflow", patterns: [/webflow/i] },
	{ name: "Weebly", patterns: [/weebly/i] },
	{ name: "Joomla", patterns: [/joomla/i, /\/media\/system/i] },
	{ name: "Drupal", patterns: [/drupal/i, /\/sites\/default/i] },
	{ name: "Gatsby", patterns: [/gatsby/i] },
	{ name: "Next.js", patterns: [/__next/i, /_next\/static/i] },
];

const SOCIAL_PATTERNS: Array<{ key: keyof SocialMediaLinks; pattern: RegExp }> = [
	{ key: "facebook", pattern: /(?:https?:)?\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i },
	{ key: "instagram", pattern: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i },
	{ key: "linkedin", pattern: /(?:https?:)?\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/i },
	{ key: "twitter", pattern: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i },
	{ key: "youtube", pattern: /(?:https?:)?\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/i },
	{ key: "tiktok", pattern: /(?:https?:)?\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+/i },
];

export async function scrapeWebsite(url: string): Promise<ScrapedWebsite> {
	const empty: ScrapedWebsite = {
		url,
		title: null,
		description: null,
		hasContactInfo: false,
		looksLegit: false,
		socialMedia: { facebook: null, instagram: null, linkedin: null, twitter: null, youtube: null, tiktok: null },
		techHints: [],
		isMobileResponsive: false,
		hasSSL: url.startsWith("https"),
		pageCount: null,
		lastModifiedHint: null,
		emails: [],
		phones: [],
	};

	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
			},
			signal: AbortSignal.timeout(8000),
		});

		if (!res.ok) return empty;

		const contentType = res.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html")) return empty;

		const html = await res.text();
		const $ = cheerio.load(html);

		const title = $("title").first().text().trim() || null;
		const description =
			$('meta[name="description"]').attr("content")?.trim() ||
			$('meta[property="og:description"]').attr("content")?.trim() ||
			null;

		const bodyText = $("body").text();
		const fullHtml = html;

		// Telefonnummer
		const phoneMatches = bodyText.match(PHONE_RE) ?? [];
		const phones = [...new Set(phoneMatches.map((p) => p.replace(/\s+/g, " ").trim()))].slice(0, 3);

		// E-post
		const emailMatches = bodyText.match(EMAIL_RE) ?? [];
		const emails = [...new Set(
			emailMatches
				.filter((e) => !e.includes("@sentry") && !e.includes("@example") && !e.endsWith(".png") && !e.endsWith(".jpg"))
		)].slice(0, 3);

		const hasPhone = phones.length > 0;
		const hasAddress = /gatan|vägen|torget|torg|allén|plan\b/i.test(bodyText);
		const hasContactInfo = hasPhone || hasAddress || emails.length > 0;

		// Titeln ser legitim ut?
		const looksLegit =
			!!title &&
			bodyText.length > 200 &&
			!/(404|not found|page not found|sidan hittades inte)/i.test(title);

		// Sociala medier
		const socialMedia: SocialMediaLinks = {
			facebook: null, instagram: null, linkedin: null, twitter: null, youtube: null, tiktok: null,
		};
		for (const { key, pattern } of SOCIAL_PATTERNS) {
			const match = fullHtml.match(pattern);
			if (match) {
				let socialUrl = match[0];
				if (socialUrl.startsWith("//")) socialUrl = "https:" + socialUrl;
				socialMedia[key] = socialUrl;
			}
		}

		// Teknik-hints
		const techHints: string[] = [];
		for (const { name, patterns } of TECH_SIGNATURES) {
			if (patterns.some((p) => p.test(fullHtml))) {
				techHints.push(name);
			}
		}

		// Viewport = mobilanpassad
		const hasViewport = !!$('meta[name="viewport"]').attr("content");
		const isMobileResponsive = hasViewport;

		// Räkna interna länkar (indikerar sidstorlek)
		let internalLinks = 0;
		try {
			const hostname = new URL(url).hostname;
			$("a[href]").each((_, el) => {
				const href = $(el).attr("href") ?? "";
				if (href.startsWith("/") || href.includes(hostname)) {
					internalLinks++;
				}
			});
		} catch { /* ignore */ }

		// Copyright-år / senaste uppdatering
		let lastModifiedHint: string | null = null;
		const copyrightMatch = bodyText.match(/(?:©|copyright)\s*(\d{4})/i);
		if (copyrightMatch) lastModifiedHint = copyrightMatch[1];

		return {
			url,
			title,
			description,
			hasContactInfo,
			looksLegit,
			socialMedia,
			techHints,
			isMobileResponsive,
			hasSSL: url.startsWith("https"),
			pageCount: internalLinks > 0 ? internalLinks : null,
			lastModifiedHint,
			emails,
			phones,
		};
	} catch {
		return empty;
	}
}
