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
	startAnalysis: async ({ params }) => {
		// Markera alla FOUND-resultat som ANALYZING
		await db.pipelineResult.updateMany({
			where: { pipelineId: params.id, status: "FOUND" },
			data: { status: "ANALYZING" },
		});

		// Simulera AI-analys med mockdata
		const results = await db.pipelineResult.findMany({
			where: { pipelineId: params.id },
		});

		const mockAnalyses = [
			{ summary: "Litet café med stark lokal kundkrets. Aktiv på Instagram men saknar egen hemsida. Bra potential för enkel webbsida med meny och öppettider.", websiteFound: null },
			{ summary: "Etablerad restaurang med många recensioner. Har en enkel Facebook-sida men ingen riktig hemsida. Behöver bokningssystem och menyvisning online.", websiteFound: "https://facebook.com/sjostaden-goteborg" },
			{ summary: "Populär frisörsalong med högt betyg. Ingen hemsida, bokar via telefon. Stor potential för online-bokningssystem.", websiteFound: null },
			{ summary: "Hantverksföretag som jobbar lokalt. Hittas bara på Eniro. Behöver presentationssida med referensprojekt.", websiteFound: "https://eniro.se/bygg-fix-ab" },
			{ summary: "Pizzeria med stort antal recensioner men lågt betyg. Har en gammal hemsida som inte fungerar på mobil.", websiteFound: "https://pizzeriaroma.nu" },
			{ summary: "Välskött bilverkstad med bra rykte. Hemsidan finns men är väldigt föråldrad.", websiteFound: null },
			{ summary: "Blomsterbutik med utmärkta recensioner. Ingen digital närvaro alls förutom Google Maps. Hög potential.", websiteFound: null },
			{ summary: "Städfirma med växande verksamhet. Ingen hemsida, marknadsför via lokala Facebook-grupper.", websiteFound: null },
			{ summary: "Franchiserestaurang med centralt läge. Har rikstäckande hemsida men inte lokal landningssida.", websiteFound: null },
			{ summary: "Elektriker med bra betyg. Hittas på Mittanbud men saknar egen hemsida.", websiteFound: "https://mittanbud.se/el-teknik" },
			{ summary: "Mysigt café med trogen kundkrets. Ingen hemsida, bara Google Maps-profil. Vill gärna visa sin meny online.", websiteFound: null },
			{ summary: "Bilglasföretag med litet kundunderlag. Ingen digital marknadsföring alls. Låg prioritet.", websiteFound: null },
			{ summary: "Modern tandvårdsklinik med proffsig hemsida. Behöver ingen hjälp med web.", websiteFound: null },
			{ summary: "Redovisningsbyrå utan hemsida. Jobbar mest via rekommendationer. Behöver trovärdighetsbyggande webbplats.", websiteFound: null },
			{ summary: "Frisörsalong med bra rykte. Bokar via Instagram DM. Vill ha eget bokningssystem.", websiteFound: "https://instagram.com/frisor_harmony" },
		];

		for (let i = 0; i < results.length; i++) {
			const analysis = mockAnalyses[i % mockAnalyses.length];
			await db.pipelineResult.update({
				where: { id: results[i].id },
				data: {
					status: "ANALYZED",
					aiAnalysis: JSON.stringify({ summary: analysis.summary }),
					aiWebsiteFound: analysis.websiteFound,
				},
			});
		}

		return { success: true };
	},

	stopAnalysis: async ({ params }) => {
		await db.pipelineResult.updateMany({
			where: { pipelineId: params.id, status: "ANALYZING" },
			data: { status: "FOUND" },
		});
		return { success: true };
	},
};
