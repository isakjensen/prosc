import * as cheerio from "cheerio";

export interface AllabolagData {
	found: boolean;
	url: string | null;
	orgNr: string | null;
	companyName: string | null;
	companyType: string | null; // AB, HB, EF, etc.
	sniCode: string | null; // Branschkod
	sniDescription: string | null;
	revenue: string | null; // Omsättning
	profit: string | null; // Resultat
	employees: string | null; // Antal anställda
	registeredYear: string | null;
	status: string | null; // Aktiv/Avförd
	address: string | null;
	boardMembers: string[]; // Styrelseledamöter
}

const EMPTY: AllabolagData = {
	found: false,
	url: null,
	orgNr: null,
	companyName: null,
	companyType: null,
	sniCode: null,
	sniDescription: null,
	revenue: null,
	profit: null,
	employees: null,
	registeredYear: null,
	status: null,
	address: null,
	boardMembers: [],
};

const HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
	"Accept-Language": "sv-SE,sv;q=0.9",
	Accept: "text/html,application/xhtml+xml",
};

/**
 * Söker efter ett företag på allabolag.se och scrapar bolagsinformation.
 * Returnerar bästa matchningen baserat på namn + stad.
 */
export async function scrapeAllabolag(
	businessName: string,
	city?: string,
): Promise<AllabolagData> {
	try {
		// Steg 1: Sök på allabolag.se
		const searchQuery = city
			? `${businessName} ${city}`
			: businessName;

		const searchUrl = `https://www.allabolag.se/what/${encodeURIComponent(searchQuery)}`;
		console.log(`  [Allabolag] Söker: ${searchUrl}`);

		const searchRes = await fetch(searchUrl, {
			headers: HEADERS,
			signal: AbortSignal.timeout(10000),
		});

		if (!searchRes.ok) {
			console.warn(`  [Allabolag] Sökning misslyckades: ${searchRes.status}`);
			return EMPTY;
		}

		const searchHtml = await searchRes.text();
		const $search = cheerio.load(searchHtml);

		// Hitta första sökresultatet som matchar
		const resultLinks: { href: string; name: string; score: number }[] = [];
		const nameParts = businessName.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

		$search("a[href*='/company/']").each((_, el) => {
			const href = $search(el).attr("href");
			const text = $search(el).text().trim().toLowerCase();
			if (!href || !text) return;

			const fullHref = href.startsWith("http")
				? href
				: `https://www.allabolag.se${href}`;

			// Poängsätt matchning
			const matchCount = nameParts.filter((p) => text.includes(p)).length;
			if (matchCount > 0) {
				resultLinks.push({ href: fullHref, name: text, score: matchCount });
			}
		});

		if (resultLinks.length === 0) {
			console.log(`  [Allabolag] Inga träffar för "${businessName}"`);
			return EMPTY;
		}

		// Sortera efter bästa matchning
		resultLinks.sort((a, b) => b.score - a.score);
		const bestMatch = resultLinks[0];
		console.log(
			`  [Allabolag] Bästa träff: "${bestMatch.name}" (score=${bestMatch.score})`,
		);

		// Steg 2: Scrapa företagssidan
		return await scrapeCompanyPage(bestMatch.href);
	} catch (err) {
		console.warn(`  [Allabolag] Fel: ${err}`);
		return EMPTY;
	}
}

async function scrapeCompanyPage(url: string): Promise<AllabolagData> {
	try {
		const res = await fetch(url, {
			headers: HEADERS,
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) {
			return { ...EMPTY, url };
		}

		const html = await res.text();
		const $ = cheerio.load(html);

		const data: AllabolagData = {
			found: true,
			url,
			orgNr: null,
			companyName: null,
			companyType: null,
			sniCode: null,
			sniDescription: null,
			revenue: null,
			profit: null,
			employees: null,
			registeredYear: null,
			status: null,
			address: null,
			boardMembers: [],
		};

		// Företagsnamn från sidtiteln
		const pageTitle = $("h1").first().text().trim();
		if (pageTitle) data.companyName = pageTitle;

		// Generisk extrahering via text-scanning
		const bodyText = $("body").text();

		// Organisationsnummer (format: XXXXXX-XXXX)
		const orgMatch = bodyText.match(/(\d{6}-\d{4})/);
		if (orgMatch) data.orgNr = orgMatch[1];

		// Gå igenom alla dt/dd-par och nyckel-värde-tabeller
		const extractKeyValue = (label: string): string | null => {
			let value: string | null = null;

			// Sök i dt/dd
			$("dt, th").each((_, el) => {
				const text = $(el).text().trim().toLowerCase();
				if (text.includes(label.toLowerCase())) {
					const next = $(el).next("dd, td").text().trim();
					if (next) value = next;
				}
			});

			// Sök i .info-pair, .data-row etc. (vanliga mönster)
			$("[class*='info'], [class*='data'], [class*='detail'], tr").each(
				(_, el) => {
					const text = $(el).text().trim();
					if (
						text.toLowerCase().includes(label.toLowerCase()) &&
						!value
					) {
						// Försök extrahera värdet efter labeln
						const parts = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
						const labelIdx = parts.findIndex((p) =>
							p.toLowerCase().includes(label.toLowerCase()),
						);
						if (labelIdx >= 0 && parts[labelIdx + 1]) {
							value = parts[labelIdx + 1];
						}
					}
				},
			);

			return value;
		};

		data.companyType = extractKeyValue("Bolagsform") ?? extractKeyValue("Företagsform");
		data.revenue = extractKeyValue("Omsättning") ?? extractKeyValue("Nettoomsättning");
		data.profit = extractKeyValue("Resultat");
		data.employees = extractKeyValue("Anställda") ?? extractKeyValue("Antal anställda");
		data.registeredYear = extractKeyValue("Registreringsår") ?? extractKeyValue("Registrerad");
		data.status = extractKeyValue("Status") ?? extractKeyValue("F-skatt");

		// SNI-kod
		const sniText = extractKeyValue("SNI") ?? extractKeyValue("Bransch");
		if (sniText) {
			const sniMatch = sniText.match(/(\d{2,5})/);
			data.sniCode = sniMatch?.[1] ?? null;
			data.sniDescription = sniText;
		}

		// Adress
		data.address = extractKeyValue("Adress") ?? extractKeyValue("Besöksadress");

		// Styrelseledamöter
		$("a[href*='/person/'], a[href*='/befattning/']").each((_, el) => {
			const name = $(el).text().trim();
			if (name && name.length > 3 && name.length < 60 && !name.includes("@")) {
				data.boardMembers.push(name);
			}
		});
		// Dedup och begränsa
		data.boardMembers = [...new Set(data.boardMembers)].slice(0, 5);

		console.log(
			`  [Allabolag] Scrapad: ${data.companyName ?? "?"} | Org: ${data.orgNr ?? "?"} | Oms: ${data.revenue ?? "?"} | Anst: ${data.employees ?? "?"}`,
		);

		return data;
	} catch (err) {
		console.warn(`  [Allabolag] Scraping misslyckades: ${err}`);
		return { ...EMPTY, url };
	}
}
