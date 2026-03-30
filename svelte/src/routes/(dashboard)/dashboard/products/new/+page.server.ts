import type { Actions } from "./$types";
import { db } from "$lib/db";
import { fail, redirect } from "@sveltejs/kit";
import { createSystemLog } from "$lib/utils/systemLog";

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get("name") as string;
		const description = (formData.get("description") as string) || null;

		if (!name?.trim()) {
			return fail(400, { error: "Produktnamn krävs" });
		}

		const product = await db.product.create({
			data: {
				name: name.trim(),
				description,
				boardColumns: {
					create: [
						{ name: "Att göra", order: 0, color: "#E5E7EB" },
						{ name: "Pågår", order: 1, color: "#DBEAFE" },
						{ name: "Granskning", order: 2, color: "#FEF3C7" },
						{ name: "Klart", order: 3, color: "#D1FAE5" },
					],
				},
			},
		});

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.create",
			entityType: "Product",
			entityId: product.id,
			details: { name: product.name },
			request,
		});

		redirect(303, `/dashboard/products/${product.id}`);
	},
};
