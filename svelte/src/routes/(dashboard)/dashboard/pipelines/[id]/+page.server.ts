import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { scrapeCategory } from "$lib/server/overpass";
import { enrichBusiness } from "$lib/server/enrich";

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
		const pipeline = await db.pipeline.findUnique({ where: { id: params.id } });
		if (!pipeline) return fail(404, { error: "Pipeline hittades inte" });

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
	},

	clearResults: async ({ params }) => {
		await db.pipelineResult.deleteMany({ where: { pipelineId: params.id } });
		await db.pipeline.update({ where: { id: params.id }, data: { status: "IDLE" } });
		return { success: true };
	},

	stop: async ({ params }) => {
		await db.pipeline.update({
			where: { id: params.id },
			data: { status: "STOPPED" },
		});
		return { success: true };
	},

	enrich: async ({ params, request }) => {
		const formData = await request.formData();
		const selectedIds = formData.getAll("selectedIds") as string[];

		const where = { pipelineId: params.id, id: { in: selectedIds } };

		// Nollställ stoppflagga och markera som ENRICHING
		await db.pipeline.update({ where: { id: params.id }, data: { enrichStopped: false } });
		await db.pipelineResult.updateMany({ where, data: { status: "ENRICHING" } });

		const results = await db.pipelineResult.findMany({
			where: { pipelineId: params.id, status: "ENRICHING" },
		});

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
