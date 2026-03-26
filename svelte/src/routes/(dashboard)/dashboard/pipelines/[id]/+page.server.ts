import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { scrapeCategory } from "$lib/server/overpass";

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
				data: { status: "COMPLETED" },
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
};
