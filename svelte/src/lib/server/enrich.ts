/**
 * Datainsamling/berikning av företagsdata UTAN AI-analys.
 * Samlar in data från:
 * 1. Allabolag.se (bolagsdata)
 * 2. DuckDuckGo (multi-sökning)
 * 3. Webscraping av hittade sidor + ev. befintlig hemsida
 */

import { searchBusiness, type MultiSearchResult } from "./web-search";
import { scrapeWebsite, type ScrapedWebsite } from "./website-scraper";
import { scrapeAllabolag, type AllabolagData } from "./allabolag";

export interface EnrichmentInput {
	businessName: string;
	category: string | null;
	address: string | null;
	phone: string | null;
	hasWebsite: boolean;
	website: string | null;
}

export interface EnrichmentData {
	enrichedAt: string; // ISO timestamp
	allabolag: AllabolagData;
	search: {
		organic: Array<{ url: string; title: string; snippet: string }>;
		directories: Array<{ url: string; title: string; snippet: string }>;
		allabolagUrl: string | null;
	};
	ownWebsite: ScrapedWebsite | null;
	scrapedSites: ScrapedWebsite[];
	// Sammanfattade datapunkter (lätta att visa i UI)
	summary: {
		hasOwnWebsite: boolean;
		websiteUrl: string | null;
		websiteTech: string[];
		websiteSSL: boolean | null;
		websiteMobile: boolean | null;
		websiteCopyrightYear: string | null;
		orgNr: string | null;
		companyName: string | null;
		companyType: string | null;
		revenue: string | null;
		profit: string | null;
		employees: string | null;
		sniDescription: string | null;
		registeredYear: string | null;
		boardMembers: string[];
		socialMedia: Record<string, string | null>;
		emails: string[];
		phones: string[];
		searchResultCount: number;
		directoryListings: number;
		scrapedSiteCount: number;
	};
}

export async function enrichBusiness(
	business: EnrichmentInput,
	logPrefix: string,
	cityName?: string,
): Promise<EnrichmentData> {
	const city =
		cityName ??
		business.address
			?.split(",")
			.filter((p) => !/^\d/.test(p.trim()))
			.pop()
			?.trim() ??
		"";

	// === 1. Allabolag.se ===
	console.log(`${logPrefix}   → Allabolag.se...`);
	let allabolagData: AllabolagData;
	try {
		allabolagData = await scrapeAllabolag(business.businessName, city);
	} catch (err) {
		console.warn(`${logPrefix}   → Allabolag misslyckades: ${err}`);
		allabolagData = emptyAllabolag();
	}

	// === 2. Multi-sökning ===
	console.log(`${logPrefix}   → DuckDuckGo (3 sökningar)...`);
	let searchResults: MultiSearchResult;
	try {
		searchResults = await searchBusiness(business.businessName, city);
	} catch (err) {
		console.warn(`${logPrefix}   → Sökning misslyckades: ${err}`);
		searchResults = { organic: [], directories: [], allabolagUrl: null };
	}

	// === 3. Scrapa befintlig hemsida ===
	let ownWebsite: ScrapedWebsite | null = null;
	if (business.website) {
		console.log(`${logPrefix}   → Scrapar OSM-hemsida: ${business.website}`);
		try {
			ownWebsite = await scrapeWebsite(business.website);
		} catch (err) {
			console.warn(`${logPrefix}   → OSM-hemsida misslyckades: ${err}`);
		}
	}

	// === 4. Scrapa topp organiska resultat ===
	const scrapedSites: ScrapedWebsite[] = [];
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

		const toScrape = scored.slice(0, 3);
		for (const { r, score } of toScrape) {
			if (business.website) {
				try {
					const hostname = new URL(business.website).hostname;
					if (r.url.includes(hostname)) continue;
				} catch { /* ignore */ }
			}

			console.log(`${logPrefix}   → Scrapar: ${r.url} (score=${score})`);
			try {
				const scraped = await scrapeWebsite(r.url);
				scrapedSites.push(scraped);
			} catch (err) {
				console.warn(`${logPrefix}   → Scraping misslyckades: ${r.url}: ${err}`);
			}
		}
	}

	// === Bygg sammanfattning ===
	const bestWebsite = ownWebsite?.looksLegit ? ownWebsite : scrapedSites.find((s) => s.looksLegit) ?? null;

	// Samla alla sociala medier från alla scrapade sidor
	const mergedSocial: Record<string, string | null> = {
		facebook: null, instagram: null, linkedin: null, twitter: null, youtube: null, tiktok: null,
	};
	const allScraped = [ownWebsite, ...scrapedSites].filter(Boolean) as ScrapedWebsite[];
	for (const site of allScraped) {
		for (const [key, val] of Object.entries(site.socialMedia)) {
			if (val && !mergedSocial[key]) {
				mergedSocial[key] = val;
			}
		}
	}

	// Samla alla e-post och telefonnummer
	const allEmails = [...new Set(allScraped.flatMap((s) => s.emails))].slice(0, 5);
	const allPhones = [...new Set(allScraped.flatMap((s) => s.phones))].slice(0, 5);

	const summary: EnrichmentData["summary"] = {
		hasOwnWebsite: !!bestWebsite,
		websiteUrl: bestWebsite?.url ?? null,
		websiteTech: bestWebsite?.techHints ?? [],
		websiteSSL: bestWebsite?.hasSSL ?? null,
		websiteMobile: bestWebsite?.isMobileResponsive ?? null,
		websiteCopyrightYear: bestWebsite?.lastModifiedHint ?? null,
		orgNr: allabolagData.orgNr,
		companyName: allabolagData.companyName,
		companyType: allabolagData.companyType,
		revenue: allabolagData.revenue,
		profit: allabolagData.profit,
		employees: allabolagData.employees,
		sniDescription: allabolagData.sniDescription,
		registeredYear: allabolagData.registeredYear,
		boardMembers: allabolagData.boardMembers,
		socialMedia: mergedSocial,
		emails: allEmails,
		phones: allPhones,
		searchResultCount: searchResults.organic.length,
		directoryListings: searchResults.directories.length,
		scrapedSiteCount: scrapedSites.length,
	};

	console.log(
		`${logPrefix}   ✓ Klar: allabolag=${allabolagData.found ? "ja" : "nej"}, sök=${searchResults.organic.length}, scrapade=${scrapedSites.length}`,
	);

	return {
		enrichedAt: new Date().toISOString(),
		allabolag: allabolagData,
		search: {
			organic: searchResults.organic.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet })),
			directories: searchResults.directories.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet })),
			allabolagUrl: searchResults.allabolagUrl,
		},
		ownWebsite,
		scrapedSites,
		summary,
	};
}

function emptyAllabolag(): AllabolagData {
	return {
		found: false, url: null, orgNr: null, companyName: null, companyType: null,
		sniCode: null, sniDescription: null, revenue: null, profit: null,
		employees: null, registeredYear: null, status: null, address: null, boardMembers: [],
	};
}
