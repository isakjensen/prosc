import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
<<<<<<< HEAD
import { env } from "$env/dynamic/private";

interface AnalysisResult {
	summary: string;
	websiteFound: string | null;
}

async function analyzeWithClaude(business: {
	businessName: string;
	address: string | null;
	phone: string | null;
	category: string | null;
	website: string | null;
	hasWebsite: boolean;
	rating: number | null;
	reviewCount: number | null;
}, apiKey: string): Promise<AnalysisResult> {
	const prompt = `Du är säljanalytiker på ett webbyrå som söker nya kunder. Analysera detta företag och bedöm deras digitala närvaro.

Företag: ${business.businessName}
Kategori: ${business.category ?? "okänd"}
Adress: ${business.address ?? "okänd"}
Telefon: ${business.phone ?? "saknas"}
Hemsida (Google Maps): ${business.website ?? "ingen"}
Betyg: ${business.rating ? `${business.rating}/5 (${business.reviewCount} recensioner)` : "inga recensioner"}

Svara ENDAST med ett JSON-objekt (ingen markdown, inga kommentarer):
{
  "summary": "kortfattad mening om företagets webbnärvaro och potential som kund",
  "websiteFound": "url om du känner till deras hemsida/sociala media utöver Google Maps, annars null"
}`;

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model: "claude-haiku-4-5-20251001",
			max_tokens: 300,
			messages: [{ role: "user", content: prompt }],
		}),
	});

	if (!response.ok) {
		throw new Error(`Claude API ${response.status}`);
	}

	const data = await response.json();
	const text: string = data.content?.[0]?.text ?? "{}";

	try {
		const parsed = JSON.parse(text);
		return {
			summary: parsed.summary ?? "Analys ej tillgänglig",
			websiteFound: parsed.websiteFound ?? null,
		};
	} catch {
		// Om Claude svarade med text utanför JSON-formatet, använd det som summary
		return { summary: text.slice(0, 300), websiteFound: null };
	}
}
=======
import { analyzeProspect } from "$lib/server/claude-analyze";
>>>>>>> claude/clarify-project-scope-i0Hoj

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
<<<<<<< HEAD
	startAnalysis: async ({ params }) => {
		const apiKey = env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			return fail(500, { error: "ANTHROPIC_API_KEY saknas i miljövariabler" });
		}

		// Markera alla FOUND-resultat som ANALYZING
		await db.pipelineResult.updateMany({
			where: { pipelineId: params.id, status: "FOUND" },
			data: { status: "ANALYZING" },
		});
=======
	startAnalysis: async ({ params, request }) => {
		const data = await request.formData();
		const selectedIds = data.getAll("selectedIds") as string[];

		// Om specifika IDs valts analyseras de oavsett tidigare status (re-analys)
		// Annars analyseras bara ej tidigare analyserade
		const where = selectedIds.length > 0
			? { pipelineId: params.id, id: { in: selectedIds } }
			: { pipelineId: params.id, status: "FOUND" as const };

		await db.pipelineResult.updateMany({ where, data: { status: "ANALYZING" } });
>>>>>>> claude/clarify-project-scope-i0Hoj

		const results = await db.pipelineResult.findMany({
			where: { pipelineId: params.id, status: "ANALYZING" },
		});

<<<<<<< HEAD
		for (const result of results) {
			try {
				const analysis = await analyzeWithClaude(result, apiKey);

=======
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

>>>>>>> claude/clarify-project-scope-i0Hoj
				await db.pipelineResult.update({
					where: { id: result.id },
					data: {
						status: "ANALYZED",
<<<<<<< HEAD
						aiAnalysis: JSON.stringify({ summary: analysis.summary }),
=======
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
>>>>>>> claude/clarify-project-scope-i0Hoj
						aiWebsiteFound: analysis.websiteFound,
					},
				});
			} catch (err) {
<<<<<<< HEAD
				console.error(`Analys misslyckades för ${result.businessName}:`, err);
				// Återställ till FOUND vid fel så användaren kan försöka igen
=======
				console.error(`${prefix} ✗ Misslyckades för ${result.businessName}:`, err);
>>>>>>> claude/clarify-project-scope-i0Hoj
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
