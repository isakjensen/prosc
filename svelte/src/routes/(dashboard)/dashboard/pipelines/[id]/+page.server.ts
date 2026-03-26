import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
<<<<<<< HEAD
import { env } from "$env/dynamic/private";

// ─── OSM / Overpass Types ─────────────────────────────────────────────────────

interface OverpassElement {
	type: "node" | "way" | "relation";
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags: Record<string, string>;
}

interface OverpassResponse {
	elements: OverpassElement[];
}

// ─── Allabolag Types ──────────────────────────────────────────────────────────

interface AllabolagEntry {
	orgnr: string;
	name: string;
	phone: string | null;
	phone2: string | null;
	mobile: string | null;
	homePage: string | null;
	email: string | null;
	postalAddress?: { postPlace?: string };
}

interface AllabolagData {
	orgNumber: string;
	phone: string | null;
	email: string | null;
	homePage: string | null;
	allabolagUrl: string;
}

// ─── OSM Kategori-mappning ────────────────────────────────────────────────────
// Mappar svenska kategorinamn → Overpass QL-filter

const OSM_CATEGORY_MAPPINGS: Array<{ patterns: string[]; filters: string[] }> = [
	{ patterns: ["restaurang"], filters: [`["amenity"="restaurant"]`] },
	{ patterns: ["café", "cafe", "kafé", "kaffebar", "fika"], filters: [`["amenity"="cafe"]`] },
	{ patterns: ["bar", "pub", "krog"], filters: [`["amenity"="bar"]`, `["amenity"="pub"]`] },
	{ patterns: ["pizzeria", "pizza"], filters: [`["amenity"="restaurant"]["cuisine"="pizza"]`, `["amenity"="fast_food"]["cuisine"="pizza"]`] },
	{ patterns: ["sushi"], filters: [`["amenity"="restaurant"]["cuisine"="sushi"]`] },
	{ patterns: ["thai"], filters: [`["amenity"="restaurant"]["cuisine"="thai"]`] },
	{ patterns: ["kebab"], filters: [`["amenity"="fast_food"]["cuisine"="kebab"]`] },
	{ patterns: ["frisör", "frisörsalong", "hårsalong", "barber", "hår"], filters: [`["shop"="hairdresser"]`, `["shop"="barber"]`] },
	{ patterns: ["bilverkstad", "bilservice", "mekaniker", "bilreparation", "däck"], filters: [`["shop"="car_repair"]`] },
	{ patterns: ["blomster", "blomsterhandl", "florist"], filters: [`["shop"="florist"]`] },
	{ patterns: ["tandläkare", "tandvård", "tandklinik", "tandhygienist"], filters: [`["amenity"="dentist"]`] },
	{ patterns: ["apotek"], filters: [`["amenity"="pharmacy"]`] },
	{ patterns: ["gym", "fitness", "träning", "crossfit", "yoga", "pilates"], filters: [`["leisure"="fitness_centre"]`] },
	{ patterns: ["hotell", "hotel", "vandrarhem", "pensionat"], filters: [`["tourism"="hotel"]`, `["tourism"="hostel"]`, `["tourism"="guest_house"]`] },
	{ patterns: ["redovisning", "revisor", "bokföring", "ekonomibyrå"], filters: [`["office"="accountant"]`] },
	{ patterns: ["advokat", "jurist", "juridik"], filters: [`["office"="lawyer"]`] },
	{ patterns: ["elektriker", "elinstallation", "el-installation"], filters: [`["craft"="electrician"]`] },
	{ patterns: ["rörmokare", "vvs", "rörläggare", "värme"], filters: [`["craft"="plumber"]`] },
	{ patterns: ["målare", "tapetsering", "golv", "golventreprenad"], filters: [`["craft"="painter"]`] },
	{ patterns: ["snickare", "snickerifirma", "träarbete", "fönster"], filters: [`["craft"="carpenter"]`] },
	{
		patterns: ["hantverkare", "hantverksfirma", "bygg"],
		filters: [
			`["craft"="electrician"]`,
			`["craft"="plumber"]`,
			`["craft"="carpenter"]`,
			`["craft"="painter"]`,
			`["craft"="construction"]`,
		],
	},
	{ patterns: ["städ", "städfirma", "rengöring", "lokalvård"], filters: [`["craft"="cleaning"]`] },
	{ patterns: ["bageri", "konditori"], filters: [`["shop"="bakery"]`] },
	{ patterns: ["läkare", "husläkare", "allmänläkare", "vårdcentral", "klinik"], filters: [`["amenity"="doctors"]`, `["amenity"="clinic"]`] },
	{ patterns: ["veterinär", "djursjukhus", "djurklinik"], filters: [`["amenity"="veterinary"]`] },
	{ patterns: ["optiker", "glasögon"], filters: [`["shop"="optician"]`] },
	{ patterns: ["skönhet", "nagel", "manikyr", "pedikyrist", "hudvård", "spa", "skönhetssalong"], filters: [`["shop"="beauty"]`] },
	{ patterns: ["massage", "massör", "massageklinik"], filters: [`["shop"="massage"]`] },
	{ patterns: ["bank", "bankkontor"], filters: [`["amenity"="bank"]`] },
	{ patterns: ["försäkring"], filters: [`["office"="insurance"]`] },
	{ patterns: ["fastighets", "mäklare", "bostad"], filters: [`["office"="estate_agent"]`] },
	{ patterns: ["reklambyra", "reklambyrå", "marknadsföring", "webbyrå"], filters: [`["office"="advertising_agency"]`] },
	{ patterns: ["it", "data", "dator", "teknik", "teknikkonsult"], filters: [`["office"="it"]`] },
	{ patterns: ["städ", "städfirma"], filters: [`["office"="cleaning_company"]`] },
];

/** Returnerar Overpass-filter för en given kategoristräng */
function findOsmFilters(category: string): string[] | null {
	const lower = category.toLowerCase().trim();

	for (const mapping of OSM_CATEGORY_MAPPINGS) {
		if (mapping.patterns.some((p) => lower.includes(p) || p.includes(lower))) {
			return mapping.filters;
		}
	}
	return null; // Okänd kategori → fallback
}

// ─── Overpass API-funktioner ──────────────────────────────────────────────────

function buildOverpassQuery(
	osmFilters: string[],
	bounds: { north: number; south: number; east: number; west: number },
	limit: number
): string {
	const bbox = `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`;
	const queries = osmFilters
		.map((f) => `  nwr${f}["name"]${bbox};`)
		.join("\n");

	return `[out:json][timeout:30];\n(\n${queries}\n);\nout body center ${limit};`;
}

function buildFallbackQuery(
	category: string,
	bounds: { north: number; south: number; east: number; west: number },
	limit: number
): string {
	const bbox = `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`;
	// Regex-sökning på OSM-namn (case-insensitive)
	const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return `[out:json][timeout:30];\n(\n  nwr["name"~"${escaped}",i]${bbox};\n);\nout body center ${limit};`;
}

function buildAddress(tags: Record<string, string>): string {
	const street = tags["addr:street"] ?? "";
	const number = tags["addr:housenumber"] ?? "";
	const postcode = tags["addr:postcode"] ?? "";
	const city = tags["addr:city"] ?? tags["addr:municipality"] ?? tags["addr:place"] ?? "";

	const parts: string[] = [];
	if (street && number) parts.push(`${street} ${number}`);
	else if (street) parts.push(street);
	if (postcode || city) parts.push([postcode, city].filter(Boolean).join(" "));

	return parts.join(", ");
}

function buildGoogleMapsUrl(name: string, lat?: number, lon?: number): string {
	if (lat !== undefined && lon !== undefined) {
		return `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lon},17z`;
	}
	return `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
}

function getCoords(el: OverpassElement): { lat: number; lon: number } | null {
	if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
		return { lat: el.lat, lon: el.lon };
	}
	if (el.center) return { lat: el.center.lat, lon: el.center.lon };
	return null;
}

function resolveCategory(tags: Record<string, string>, fallbackCategory: string): string {
	// Plocka ut en läsbar kategorilabel från OSM-taggar
	const amenityLabels: Record<string, string> = {
		restaurant: "Restaurang", cafe: "Café", bar: "Bar", pub: "Pub",
		dentist: "Tandläkare", pharmacy: "Apotek", doctors: "Läkare",
		clinic: "Klinik", veterinary: "Veterinär", bank: "Bank",
	};
	const shopLabels: Record<string, string> = {
		hairdresser: "Frisör", barber: "Barber", car_repair: "Bilverkstad",
		florist: "Blomsterhandlare", bakery: "Bageri", optician: "Optiker",
		beauty: "Skönhetssalong", massage: "Massage", cleaning: "Städfirma",
	};
	const craftLabels: Record<string, string> = {
		electrician: "Elektriker", plumber: "Rörmokare", carpenter: "Snickare",
		painter: "Målare", construction: "Byggfirma", cleaning: "Städfirma",
	};
	const leisureLabels: Record<string, string> = { fitness_centre: "Gym" };
	const tourismLabels: Record<string, string> = {
		hotel: "Hotell", hostel: "Vandrarhem", guest_house: "Pensionat",
	};
	const officeLabels: Record<string, string> = {
		accountant: "Redovisningsbyrå", lawyer: "Advokatbyrå",
		estate_agent: "Fastighetsmäklare", advertising_agency: "Reklambyrå",
		insurance: "Försäkring", it: "IT-konsult",
	};

	if (tags.amenity) return amenityLabels[tags.amenity] ?? tags.amenity;
	if (tags.shop) return shopLabels[tags.shop] ?? tags.shop;
	if (tags.craft) return craftLabels[tags.craft] ?? tags.craft;
	if (tags.leisure) return leisureLabels[tags.leisure] ?? tags.leisure;
	if (tags.tourism) return tourismLabels[tags.tourism] ?? tags.tourism;
	if (tags.office) return officeLabels[tags.office] ?? tags.office;
	return fallbackCategory;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

async function searchOSM(
	category: string,
	bounds: { north: number; south: number; east: number; west: number },
	limit = 60
): Promise<OverpassElement[]> {
	const osmFilters = findOsmFilters(category);
	const query = osmFilters
		? buildOverpassQuery(osmFilters, bounds, limit)
		: buildFallbackQuery(category, bounds, limit);

	const response = await fetch(OVERPASS_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: `data=${encodeURIComponent(query)}`,
		signal: AbortSignal.timeout(35_000),
	});

	if (!response.ok) {
		throw new Error(`Overpass API ${response.status}`);
	}

	const data = (await response.json()) as OverpassResponse;
	return data.elements ?? [];
}

// ─── Allabolag-hjälpfunktioner ────────────────────────────────────────────────

function extractCity(address: string | null): string {
	if (!address) return "";
	const parts = address.split(",").map((p) => p.trim()).filter((p) => !["Sverige", "Sweden"].includes(p));
	const last = parts[parts.length - 1] ?? "";
	return last.replace(/^\d{3}\s?\d{2}\s+/, "").replace(/^\d+\s+/, "").trim();
}

function formatOrgNumber(orgnr: string): string {
	const clean = orgnr.replace(/\D/g, "");
	return clean.length === 10 ? `${clean.slice(0, 6)}-${clean.slice(6)}` : clean;
}

function normalizeCompanyName(name: string): string {
	return name
		.toLowerCase()
		.replace(/\b(aktiebolag|ab|handelsbolag|hb|kommanditbolag|kb|ekonomisk\s+f[öo]rening|ef)\b/gi, "")
		.replace(/[^a-zåäö0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function namesMatch(mapsName: string, allabolagName: string): boolean {
	const n1 = normalizeCompanyName(mapsName);
	const n2 = normalizeCompanyName(allabolagName);
	if (!n1 || !n2) return false;
	return n1.includes(n2) || n2.includes(n1);
}

function parseAllabolagEntries(html: string): AllabolagEntry[] {
	const entries: AllabolagEntry[] = [];
	let pos = 0;

	while (true) {
		const idx = html.indexOf('"orgnr":"', pos);
		if (idx === -1) break;

		const openBrace = html.lastIndexOf("{", idx);
		if (openBrace === -1) { pos = idx + 1; continue; }

		let depth = 0, end = openBrace;
		for (let i = openBrace; i < html.length; i++) {
			if (html[i] === "{") depth++;
			else if (html[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
		}

		try {
			const obj = JSON.parse(html.slice(openBrace, end));
			if (obj.orgnr && obj.name) entries.push(obj as AllabolagEntry);
		} catch { /* hoppa över */ }

		pos = idx + 1;
	}

	return entries;
}

async function enrichFromAllabolag(
	businessName: string,
	address: string | null
): Promise<AllabolagData | null> {
	const city = extractCity(address);

	const searchUrls = [
		city
			? `https://www.allabolag.se/what/${encodeURIComponent(businessName)}/where/${encodeURIComponent(city)}`
			: null,
		`https://www.allabolag.se/what/${encodeURIComponent(businessName)}`,
	].filter(Boolean) as string[];

	for (const url of searchUrls) {
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Accept: "text/html,application/xhtml+xml",
					"Accept-Language": "sv-SE,sv;q=0.9",
				},
				signal: AbortSignal.timeout(6000),
			});

			if (!response.ok) continue;

			const html = await response.text();
			const entries = parseAllabolagEntries(html);

			const match = entries.find((e) => {
				if (!namesMatch(businessName, e.name)) return false;
				if (!city) return true;
				const entryCity = e.postalAddress?.postPlace ?? "";
				return (
					entryCity.toLowerCase().includes(city.toLowerCase()) ||
					city.toLowerCase().includes(entryCity.toLowerCase())
				);
			});

			if (match) {
				return {
					orgNumber: formatOrgNumber(match.orgnr),
					phone: match.phone ?? match.phone2 ?? match.mobile ?? null,
					email: match.email ?? null,
					homePage: match.homePage ?? null,
					allabolagUrl: `https://www.allabolag.se/${match.orgnr}`,
				};
			}
		} catch { /* timeout eller nätverksfel */ }
	}

	return null;
}

// ─── Load ─────────────────────────────────────────────────────────────────────
=======
import { scrapeCategory } from "$lib/server/overpass";
import { enrichBusiness } from "$lib/server/enrich";
>>>>>>> claude/clarify-project-scope-i0Hoj

export const load: PageServerLoad = async ({ params }) => {
	const pipeline = await db.pipeline.findUnique({
		where: { id: params.id },
		include: { results: { orderBy: { createdAt: "desc" } } },
	});

	if (!pipeline) throw error(404, "Pipeline hittades inte");

	return { pipeline };
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {
	start: async ({ params }) => {
		const pipeline = await db.pipeline.findUnique({ where: { id: params.id } });
		if (!pipeline) return fail(404, { error: "Pipeline hittades inte" });
<<<<<<< HEAD

		// Rensa gamla resultat och sätt RUNNING
		await db.pipelineResult.deleteMany({ where: { pipelineId: params.id } });
		await db.pipeline.update({ where: { id: params.id }, data: { status: "RUNNING" } });

		try {
			const bounds = pipeline.areaConfig
				? JSON.parse(pipeline.areaConfig)
				: { north: 69.1, south: 55.3, east: 24.2, west: 10.9 }; // Hela Sverige

			const categories: string[] = pipeline.categories ? JSON.parse(pipeline.categories) : [];

			if (categories.length === 0) {
				await db.pipeline.update({ where: { id: params.id }, data: { status: "COMPLETED" } });
				return { success: true };
			}

			// ── Steg 1: Sök via OpenStreetMap Overpass API ──────────────────────
			const seenIds = new Set<string>(); // OSM element-ID för deduplicering
			type SavedResult = { id: string; businessName: string; address: string | null; hasPhone: boolean; hasWebsite: boolean };
			const savedResults: SavedResult[] = [];

			for (const category of categories) {
				let elements: OverpassElement[];

				try {
					elements = await searchOSM(category, bounds, 60);
				} catch (err) {
					console.warn(`OSM-sökning misslyckades för "${category}":`, err);
					continue;
				}

				for (const el of elements) {
					const osmKey = `${el.type}/${el.id}`;
					if (seenIds.has(osmKey)) continue;
					seenIds.add(osmKey);

					const tags = el.tags ?? {};
					const name = tags.name;
					if (!name) continue;

					const coords = getCoords(el);
					const address = buildAddress(tags);
					const phone = tags.phone ?? tags["contact:phone"] ?? null;
					const website = tags.website ?? tags["contact:website"] ?? tags.url ?? null;
					const hasWebsite = !!website;
					const categoryLabel = resolveCategory(tags, category);
					const googleMapsUrl = buildGoogleMapsUrl(name, coords?.lat, coords?.lon);

					const created = await db.pipelineResult.create({
						data: {
							pipelineId: params.id,
							businessName: name,
							address: address || null,
							phone,
							category: categoryLabel,
							website,
							hasWebsite,
							googleMapsUrl,
							rating: null,   // OSM har inte betyg
							reviewCount: null,
						},
					});

					savedResults.push({
						id: created.id,
						businessName: name,
						address: address || null,
						hasPhone: !!phone,
						hasWebsite,
					});
				}

				// Paus mellan kategorier för att respektera Overpass-tjänsten
				await new Promise((res) => setTimeout(res, 1000));
			}

			// ── Steg 2: Berika med Allabolag.se (5 parallellt) ─────────────────
			const BATCH_SIZE = 5;
			for (let i = 0; i < savedResults.length; i += BATCH_SIZE) {
				const batch = savedResults.slice(i, i + BATCH_SIZE);

				await Promise.all(
					batch.map(async (r) => {
						const info = await enrichFromAllabolag(r.businessName, r.address);
						if (!info) return;

						await db.pipelineResult.update({
							where: { id: r.id },
							data: {
								...(!r.hasPhone && info.phone ? { phone: info.phone } : {}),
								...(!r.hasWebsite && info.homePage ? { website: info.homePage, hasWebsite: true } : {}),
								...(info.email ? { email: info.email } : {}),
								...(info.orgNumber ? { orgNumber: info.orgNumber } : {}),
								...(info.allabolagUrl ? { allabolagUrl: info.allabolagUrl } : {}),
							},
						});
					})
				);

				if (i + BATCH_SIZE < savedResults.length) {
					await new Promise((res) => setTimeout(res, 300));
				}
			}

			await db.pipeline.update({ where: { id: params.id }, data: { status: "COMPLETED" } });
			return { success: true };
		} catch (err) {
			await db.pipeline.update({ where: { id: params.id }, data: { status: "STOPPED" } });
			console.error("Pipeline-fel:", err);
			return fail(500, { error: "Sökning misslyckades. Försök igen." });
		}
=======

		if (!pipeline.areaConfig) {
			return fail(400, { error: "Du måste välja ett område på kartan innan du kan starta scraping" });
		}

		await db.pipeline.update({
			where: { id: params.id },
			data: { status: "RUNNING" },
		});

		try {
			const bounds = JSON.parse(pipeline.areaConfig);
			const categories: string[] = pipeline.categories ? JSON.parse(pipeline.categories) : [];

			if (categories.length === 0) {
				await db.pipeline.update({ where: { id: params.id }, data: { status: "STOPPED" } });
				return fail(400, { error: "Inga kategorier valda" });
			}

			for (const category of categories) {
				const results = await scrapeCategory(category, bounds);

				for (const result of results) {
					await db.pipelineResult.create({
						data: {
							pipelineId: params.id,
							businessName: result.businessName,
							address: result.address,
							phone: result.phone,
							website: result.website,
							hasWebsite: result.hasWebsite,
							category: result.category,
						},
					});
				}
			}

			await db.pipeline.update({
				where: { id: params.id },
				data: { status: "COMPLETED", lastScrapedAt: new Date() },
			});

			return { success: true };
		} catch (err) {
			console.error("[Pipeline] Scraping-fel:", err);
			await db.pipeline.update({
				where: { id: params.id },
				data: { status: "STOPPED" },
			});
			return fail(500, { error: "Scraping misslyckades. Kontrollera internetanslutning och försök igen." });
		}
	},

	update: async ({ params, request }) => {
		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		const description = (data.get("description") as string)?.trim();
		const areaConfig = (data.get("areaConfig") as string) || null;
		const categories = (data.get("categories") as string) || null;

		if (!name) return fail(400, { error: "Namn krävs" });
		if (!description) return fail(400, { error: "Beskrivning krävs" });

		await db.pipeline.update({
			where: { id: params.id },
			data: { name, description, areaConfig, categories, status: "IDLE" },
		});

		return { success: true };
>>>>>>> claude/clarify-project-scope-i0Hoj
	},

	clearResults: async ({ params }) => {
		await db.pipelineResult.deleteMany({ where: { pipelineId: params.id } });
		await db.pipeline.update({ where: { id: params.id }, data: { status: "IDLE" } });
		return { success: true };
	},

	stop: async ({ params }) => {
		await db.pipeline.update({ where: { id: params.id }, data: { status: "STOPPED" } });
		return { success: true };
	},

	enrich: async ({ params, request }) => {
		const formData = await request.formData();
		const selectedIds = formData.getAll("selectedIds") as string[];

		if (selectedIds.length === 0) {
			return { error: "Inga företag valda" };
		}

		const where = { pipelineId: params.id, id: { in: selectedIds } };

		// Nollställ stoppflagga och markera som ENRICHING
		await db.pipeline.update({ where: { id: params.id }, data: { enrichStopped: false } });
		await db.pipelineResult.updateMany({ where, data: { status: "ENRICHING" } });

		const results = await db.pipelineResult.findMany({ where });

		const pipeline = await db.pipeline.findUnique({ where: { id: params.id } });
		const cityName: string | undefined = pipeline?.areaConfig
			? JSON.parse(pipeline.areaConfig).cityName
			: undefined;

		const total = results.length;
		console.log(`\n[Berikning] Startar – ${total} företag${cityName ? ` (${cityName})` : ""}`);

		for (let i = 0; i < results.length; i++) {
			// Kontrollera stoppflagga
			const pipelineCheck = await db.pipeline.findUnique({ where: { id: params.id }, select: { enrichStopped: true } });
			if (pipelineCheck?.enrichStopped) {
				console.log(`[Berikning] Stoppad av användaren`);
				await db.pipelineResult.updateMany({ where: { pipelineId: params.id, status: "ENRICHING" }, data: { status: "FOUND" } });
				break;
			}

			const result = results[i];
			const prefix = `[${i + 1}/${total}] ${result.businessName}`;
			console.log(`${prefix}`);

			try {
				const enrichment = await enrichBusiness(
					{
						businessName: result.businessName,
						category: result.category,
						address: result.address,
						phone: result.phone,
						hasWebsite: result.hasWebsite,
						website: result.website,
					},
					prefix,
					cityName,
				);

				await db.pipelineResult.update({
					where: { id: result.id },
					data: {
						status: "ENRICHED",
						enrichmentData: JSON.stringify(enrichment),
					},
				});
			} catch (err) {
				console.error(`${prefix} ✗ Misslyckades:`, err);
				await db.pipelineResult.update({
					where: { id: result.id },
					data: { status: "FOUND" },
				});
			}
		}

		console.log(`[Berikning] Klar!
`);
		await db.pipeline.update({ where: { id: params.id }, data: { lastEnrichedAt: new Date() } });
		return { success: true };
	},

	stopEnrich: async ({ params }) => {
		await db.pipeline.update({
			where: { id: params.id },
			data: { enrichStopped: true },
		});
		await db.pipelineResult.updateMany({
			where: { pipelineId: params.id, status: "ENRICHING" },
			data: { status: "FOUND" },
		});
		return { success: true };
	},
};
