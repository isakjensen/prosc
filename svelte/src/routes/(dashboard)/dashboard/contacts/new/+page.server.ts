import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	const companies = await db.company.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	return { companies };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}

		const data = await request.formData();
		const companyId = data.get("companyId") as string;
		const firstName = (data.get("firstName") as string)?.trim();
		const lastName = (data.get("lastName") as string)?.trim();
		const email = (data.get("email") as string)?.trim() || undefined;
		const phone = (data.get("phone") as string)?.trim() || undefined;
		const title = (data.get("title") as string)?.trim() || undefined;
		const notes = (data.get("notes") as string)?.trim() || undefined;

		if (!companyId || !firstName || !lastName) {
			return fail(400, { error: "Företag, förnamn och efternamn krävs" });
		}

		const contact = await db.contact.create({
			data: {
				companyId,
				firstName,
				lastName,
				email,
				phone,
				title,
				notes,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "contact.create",
			entityType: "Contact",
			entityId: contact.id,
			details: { firstName, lastName, companyId },
			request,
		});

		throw redirect(303, `/dashboard/contacts/${contact.id}`);
	},
};
