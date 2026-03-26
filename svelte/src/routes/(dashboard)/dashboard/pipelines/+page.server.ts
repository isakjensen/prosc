import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async () => {
	const pipelines = await db.pipeline.findMany({
		include: {
			_count: {
				select: { results: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return { pipelines };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		const description = (data.get("description") as string)?.trim();
		const areaConfig = (data.get("areaConfig") as string) || null;
		const categories = (data.get("categories") as string) || null;

		if (!name) {
			return fail(400, { error: "Namn krävs" });
		}
		if (!description) {
			return fail(400, { error: "Beskrivning krävs" });
		}

		const pipeline = await db.pipeline.create({
			data: {
				name,
				description,
				areaConfig,
				categories,
			},
		});

		throw redirect(303, `/dashboard/pipelines/${pipeline.id}`);
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		await db.pipeline.delete({ where: { id } });

		return { success: true };
	},
};
