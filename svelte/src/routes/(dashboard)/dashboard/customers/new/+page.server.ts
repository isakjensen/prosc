import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	// No stages needed for customers
	return {};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}

		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		const email = (data.get("email") as string)?.trim() || undefined;
		const phone = (data.get("phone") as string)?.trim() || undefined;
		const industry = (data.get("industry") as string)?.trim() || undefined;
		const website = (data.get("website") as string)?.trim() || undefined;

		if (!name) {
			return fail(400, { error: "Företagsnamn krävs" });
		}

		const company = await db.company.create({
			data: {
				name,
				email,
				phone,
				industry,
				website,
				type: "CUSTOMER",
			},
		});

		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Kund skapad",
				description: `Skapade kund: ${name}`,
				companyId: company.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "customer.create",
			entityType: "Company",
			entityId: company.id,
			details: { name },
			request,
		});

		throw redirect(303, `/dashboard/customers/${company.id}`);
	},
};
