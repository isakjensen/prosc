import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ params }) => {
	const pipeline = await db.pipeline.findUnique({
		where: { id: params.id },
		include: {
			results: {
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!pipeline) {
		throw error(404, "Pipeline hittades inte");
	}

	return { pipeline };
};

export const actions: Actions = {
	start: async ({ params }) => {
		await db.pipeline.update({
			where: { id: params.id },
			data: { status: "RUNNING" },
		});

		// TODO: Starta faktisk scraping-process
		// Mockdata: Lägg till några fejkade resultat
		const mockResults = [
			{ businessName: "Café Solsidan", address: "Storgatan 12, Stockholm", phone: "08-123 456", category: "Caféer", hasWebsite: false, rating: 4.2, reviewCount: 87 },
			{ businessName: "Restaurang Sjöstaden", address: "Hamngatan 5, Göteborg", phone: "031-789 012", category: "Restauranger", hasWebsite: true, website: "https://sjostaden.se", rating: 3.8, reviewCount: 142 },
			{ businessName: "Klippoteket", address: "Drottninggatan 34, Malmö", phone: "040-567 890", category: "Frisörer", hasWebsite: false, rating: 4.5, reviewCount: 63 },
			{ businessName: "Bygg & Fix AB", address: "Industrivägen 7, Uppsala", phone: "018-234 567", category: "Hantverkare", hasWebsite: false, rating: 4.0, reviewCount: 31 },
			{ businessName: "Pizzeria Roma", address: "Kungsgatan 22, Linköping", phone: "013-456 789", category: "Restauranger", hasWebsite: false, rating: 3.5, reviewCount: 210 },
			{ businessName: "Motor & Service", address: "Verkstadsgatan 3, Västerås", phone: "021-345 678", category: "Bilverkstäder", hasWebsite: true, website: "https://motorservice.se", rating: 4.1, reviewCount: 55 },
			{ businessName: "Blomsterboden", address: "Torget 1, Örebro", phone: "019-567 890", category: "Blomsterhandlare", hasWebsite: false, rating: 4.7, reviewCount: 92 },
			{ businessName: "Städexperten", address: "Parkvägen 15, Norrköping", phone: "011-678 901", category: "Städfirmor", hasWebsite: false, rating: 3.9, reviewCount: 28 },
			{ businessName: "Sushi Yama Express", address: "Centralgatan 8, Helsingborg", phone: "042-789 012", category: "Restauranger", hasWebsite: true, website: "https://sushiyama.se", rating: 4.3, reviewCount: 178 },
			{ businessName: "El & Teknik", address: "Fabriksgatan 11, Jönköping", phone: "036-890 123", category: "Hantverkare", hasWebsite: false, rating: 4.4, reviewCount: 44 },
			{ businessName: "Café Kanelen", address: "Lilla Torg 6, Lund", phone: "046-901 234", category: "Caféer", hasWebsite: false, rating: 4.6, reviewCount: 156 },
			{ businessName: "Malmö Bilglas", address: "Yttre Ringvägen 45, Malmö", phone: "040-012 345", category: "Bilverkstäder", hasWebsite: false, rating: 3.7, reviewCount: 19 },
			{ businessName: "Tandvård Plus", address: "Nygatan 20, Gävle", phone: "026-123 456", category: "Tandläkare", hasWebsite: true, website: "https://tandvardplus.se", rating: 4.8, reviewCount: 203 },
			{ businessName: "Redovisning & Råd", address: "Bankgatan 9, Sundsvall", phone: "060-234 567", category: "Redovisningsbyråer", hasWebsite: false, rating: 4.1, reviewCount: 37 },
			{ businessName: "Frisör Harmony", address: "Strandvägen 18, Karlstad", phone: "054-345 678", category: "Frisörer", hasWebsite: false, rating: 4.3, reviewCount: 71 },
		];

		for (const result of mockResults) {
			await db.pipelineResult.create({
				data: {
					pipelineId: params.id,
					...result,
				},
			});
		}

		await db.pipeline.update({
			where: { id: params.id },
			data: { status: "COMPLETED" },
		});

		return { success: true };
	},

	stop: async ({ params }) => {
		await db.pipeline.update({
			where: { id: params.id },
			data: { status: "STOPPED" },
		});
		return { success: true };
	},
};
