import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
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
		const apiKey = env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			return fail(500, { error: "ANTHROPIC_API_KEY saknas i miljövariabler" });
		}

		// Markera alla FOUND-resultat som ANALYZING
		await db.pipelineResult.updateMany({
			where: { pipelineId: params.id, status: "FOUND" },
			data: { status: "ANALYZING" },
		});

		const results = await db.pipelineResult.findMany({
			where: { pipelineId: params.id, status: "ANALYZING" },
		});

		for (const result of results) {
			try {
				const analysis = await analyzeWithClaude(result, apiKey);

				await db.pipelineResult.update({
					where: { id: result.id },
					data: {
						status: "ANALYZED",
						aiAnalysis: JSON.stringify({ summary: analysis.summary }),
						aiWebsiteFound: analysis.websiteFound,
					},
				});
			} catch (err) {
				console.error(`Analys misslyckades för ${result.businessName}:`, err);
				// Återställ till FOUND vid fel så användaren kan försöka igen
				await db.pipelineResult.update({
					where: { id: result.id },
					data: { status: "FOUND" },
				});
			}
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
