import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { analyzeProspect } from "$lib/server/claude-analyze";

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
	startAnalysis: async ({ params, request }) => {
		const data = await request.formData();
		const selectedIds = data.getAll("selectedIds") as string[];

		// Om specifika IDs valts analyseras de oavsett tidigare status (re-analys)
		// Annars analyseras bara ej tidigare analyserade
		const where = selectedIds.length > 0
			? { pipelineId: params.id, id: { in: selectedIds } }
			: { pipelineId: params.id, status: "FOUND" as const };

		await db.pipelineResult.updateMany({ where, data: { status: "ANALYZING" } });

		const results = await db.pipelineResult.findMany({
			where: { pipelineId: params.id, status: "ANALYZING" },
		});

		const pipeline = await db.pipeline.findUnique({ where: { id: params.id } });
		const cityName: string | undefined = pipeline?.areaConfig
			? JSON.parse(pipeline.areaConfig).cityName
			: undefined;

		const total = results.length;
		console.log(`\n[AI-analys] Startar – ${total} företag att analysera${cityName ? ` (${cityName})` : ""}`);

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const prefix = `[${i + 1}/${total}]`;
			console.log(`${prefix} Analyserar: ${result.businessName} (${result.category ?? "okänd kategori"})`);

			try {
				const analysis = await analyzeProspect(
					{
						businessName: result.businessName,
						category: result.category,
						address: result.address,
						phone: result.phone,
						hasWebsite: result.hasWebsite,
						website: result.website,
					},
					prefix,
					cityName
				);

				console.log(`${prefix} ✓ Klar – Prioritet: ${analysis.priority} | Hemsida: ${analysis.websiteFound ?? "ingen hittad"}`);

				// Spara all insamlad data
				const { collectedData } = analysis;
				const allabolag = collectedData.allabolag;

				await db.pipelineResult.update({
					where: { id: result.id },
					data: {
						status: "ANALYZED",
						aiAnalysis: JSON.stringify({
							summary: analysis.summary,
							priority: analysis.priority,
							promptUsed: analysis.promptUsed,
							allabolag: allabolag.found ? {
								orgNr: allabolag.orgNr,
								companyName: allabolag.companyName,
								companyType: allabolag.companyType,
								revenue: allabolag.revenue,
								profit: allabolag.profit,
								employees: allabolag.employees,
								sniDescription: allabolag.sniDescription,
								registeredYear: allabolag.registeredYear,
								boardMembers: allabolag.boardMembers,
								url: allabolag.url,
							} : null,
							ownWebsite: collectedData.ownWebsite ? {
								url: collectedData.ownWebsite.url,
								title: collectedData.ownWebsite.title,
								techHints: collectedData.ownWebsite.techHints,
								isMobileResponsive: collectedData.ownWebsite.isMobileResponsive,
								hasSSL: collectedData.ownWebsite.hasSSL,
								socialMedia: collectedData.ownWebsite.socialMedia,
								emails: collectedData.ownWebsite.emails,
								phones: collectedData.ownWebsite.phones,
							} : null,
							searchResultCount: collectedData.searchResults.organic.length,
							directoryCount: collectedData.searchResults.directories.length,
							scrapedSiteCount: collectedData.scrapedSites.length,
						}),
						aiWebsiteFound: analysis.websiteFound,
					},
				});
			} catch (err) {
				console.error(`${prefix} ✗ Misslyckades för ${result.businessName}:`, err);
				await db.pipelineResult.update({
					where: { id: result.id },
					data: { status: "FOUND" },
				});
			}
		}

		console.log(`[AI-analys] Klar!
`);

		await db.pipeline.update({ where: { id: params.id }, data: { lastAnalyzedAt: new Date() } });
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
