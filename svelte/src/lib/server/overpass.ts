export interface AreaBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}

interface OverpassElement {
	type: "node" | "way" | "relation";
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

interface OverpassResponse {
	elements: OverpassElement[];
}

export interface ScrapedBusiness {
	businessName: string;
	address: string | null;
	phone: string | null;
	website: string | null;
	hasWebsite: boolean;
	category: string;
}

// Swedish category names (lowercase) → OSM tags
const CATEGORY_MAP: Record<string, { key: string; value?: string }> = {
	restauranger: { key: "amenity", value: "restaurant" },
	restaurant: { key: "amenity", value: "restaurant" },
	caféer: { key: "amenity", value: "cafe" },
	kafeer: { key: "amenity", value: "cafe" },
	café: { key: "amenity", value: "cafe" },
	kafé: { key: "amenity", value: "cafe" },
	frisörer: { key: "shop", value: "hairdresser" },
	frisorer: { key: "shop", value: "hairdresser" },
	frisör: { key: "shop", value: "hairdresser" },
	hantverkare: { key: "craft" },
	bilverkstäder: { key: "shop", value: "car_repair" },
	bilverkstader: { key: "shop", value: "car_repair" },
	bilverkstad: { key: "shop", value: "car_repair" },
	tandläkare: { key: "amenity", value: "dentist" },
	tandlakare: { key: "amenity", value: "dentist" },
	redovisningsbyråer: { key: "office", value: "accountant" },
	redovisningsbyraer: { key: "office", value: "accountant" },
	redovisningsbyrå: { key: "office", value: "accountant" },
	byggfirmor: { key: "craft", value: "builder" },
	blomsterhandlare: { key: "shop", value: "florist" },
	blomsteraffärer: { key: "shop", value: "florist" },
	blomsteraffarer: { key: "shop", value: "florist" },
	städfirmor: { key: "craft", value: "cleaning" },
	stadfirmor: { key: "craft", value: "cleaning" },
	tatueringsstudior: { key: "shop", value: "tattoo" },
	veterinärer: { key: "amenity", value: "veterinary" },
	veterinarer: { key: "amenity", value: "veterinary" },
	fastighetsmäklare: { key: "office", value: "estate_agent" },
	fastighetsmaklare: { key: "office", value: "estate_agent" },
	advokater: { key: "office", value: "lawyer" },
	apotek: { key: "amenity", value: "pharmacy" },
	gym: { key: "leisure", value: "fitness_centre" },
	hotell: { key: "tourism", value: "hotel" },
	bagerier: { key: "shop", value: "bakery" },
	bageri: { key: "shop", value: "bakery" },
	skönhetssalonger: { key: "shop", value: "beauty" },
	skonhetssalonger: { key: "shop", value: "beauty" },
	nagelsalonger: { key: "shop", value: "nail_salon" },
	elektriker: { key: "craft", value: "electrician" },
	rörmokare: { key: "craft", value: "plumber" },
	rormokare: { key: "craft", value: "plumber" },
	målare: { key: "craft", value: "painter" },
	malare: { key: "craft", value: "painter" },
	snickare: { key: "craft", value: "carpenter" },
	läkare: { key: "amenity", value: "doctors" },
	lakare: { key: "amenity", value: "doctors" },
	pizzerior: { key: "amenity", value: "restaurant" },
	pizzeria: { key: "amenity", value: "restaurant" },
	butiker: { key: "shop", value: "clothes" },
	livsmedel: { key: "shop", value: "supermarket" },
	mataffärer: { key: "shop", value: "supermarket" },
	mataffarer: { key: "shop", value: "supermarket" },
	konditori: { key: "shop", value: "pastry" },
	konditorier: { key: "shop", value: "pastry" },
};

function getOsmTag(category: string): { key: string; value?: string } | null {
	const lower = category.toLowerCase().trim();

	if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

	// Try without Swedish chars
	const normalized = lower
		.replace(/å/g, "a")
		.replace(/ä/g, "a")
		.replace(/ö/g, "o");
	if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];

	// Partial match
	for (const [key, tag] of Object.entries(CATEGORY_MAP)) {
		if (lower.includes(key) || key.includes(lower)) return tag;
	}

	return null;
}

function buildQuery(tag: { key: string; value?: string }, bounds: AreaBounds): string {
	const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
	const filter = tag.value ? `["${tag.key}"="${tag.value}"]` : `["${tag.key}"]`;

	return `[out:json][timeout:30];
(
  node${filter}(${bbox});
  way${filter}(${bbox});
  relation${filter}(${bbox});
);
out center;`;
}

function parseAddress(tags: Record<string, string>): string | null {
	const street = tags["addr:street"];
	const number = tags["addr:housenumber"];
	const city = tags["addr:city"];

	const parts: string[] = [];
	if (street) parts.push(street + (number ? " " + number : ""));
	if (city) parts.push(city);

	return parts.length > 0 ? parts.join(", ") : (tags["addr:full"] ?? null);
}

function parseWebsite(tags: Record<string, string>): string | null {
	return tags["website"] ?? tags["contact:website"] ?? tags["url"] ?? null;
}

function parsePhone(tags: Record<string, string>): string | null {
	return tags["phone"] ?? tags["contact:phone"] ?? tags["tel"] ?? null;
}

const OVERPASS_ENDPOINTS = [
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
	"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function fetchOverpass(query: string, retries = 3): Promise<OverpassResponse> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < retries; attempt++) {
		const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: `data=${encodeURIComponent(query)}`,
			});

			if (response.status === 429 || response.status === 504 || response.status === 502) {
				lastError = new Error(`${endpoint} svarade med ${response.status}`);
				await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
				continue;
			}

			if (!response.ok) {
				throw new Error(`Overpass API svarade med ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			if (attempt < retries - 1) {
				await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
			}
		}
	}

	throw lastError ?? new Error("Overpass API otillgänglig");
}

export async function scrapeCategory(
	category: string,
	bounds: AreaBounds
): Promise<ScrapedBusiness[]> {
	const osmTag = getOsmTag(category);

	if (!osmTag) {
		console.warn(`[Overpass] Ingen OSM-mappning för kategori: "${category}"`);
		return [];
	}

	const query = buildQuery(osmTag, bounds);

	const data = await fetchOverpass(query);

	const businesses: ScrapedBusiness[] = [];
	const seen = new Set<string>();

	for (const element of data.elements) {
		const tags = element.tags ?? {};
		const name = tags["name"];

		if (!name) continue;

		const dedupeKey = name.toLowerCase();
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		const website = parseWebsite(tags);

		businesses.push({
			businessName: name,
			address: parseAddress(tags),
			phone: parsePhone(tags),
			website,
			hasWebsite: !!website,
			category,
		});
	}

	console.log(`[Overpass] ${category}: ${businesses.length} företag hittade`);
	return businesses;
}
