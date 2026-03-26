import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ params }) => {
	const contact = await db.contact.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true, type: true } },
		},
	});
	if (!contact) {
		throw error(404, "Kontakt hittades inte");
	}
	return { contact };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const firstName = (data.get("firstName") as string)?.trim();
		const lastName = (data.get("lastName") as string)?.trim();
		const email = (data.get("email") as string)?.trim() || undefined;
		const phone = (data.get("phone") as string)?.trim() || undefined;
		const title = (data.get("title") as string)?.trim() || undefined;
		const notes = (data.get("notes") as string)?.trim() || undefined;

		if (!firstName || !lastName) {
			return { error: "Förnamn och efternamn krävs" };
		}

		await db.contact.update({
			where: { id: params.id },
			data: {
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
			action: "contact.update",
			entityType: "Contact",
			entityId: params.id,
			details: { firstName, lastName },
			request,
		});
		return { success: true };
	},
};
