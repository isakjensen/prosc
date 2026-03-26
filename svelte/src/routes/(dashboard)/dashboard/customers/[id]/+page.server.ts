import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ params }) => {
	const company = await db.company.findUnique({
		where: { id: params.id },
		include: {
			contacts: true,
			projects: {
				select: {
					id: true,
					name: true,
					status: true,
				},
			},
			quotes: {
				orderBy: { createdAt: "desc" },
				take: 10,
				select: {
					id: true,
					number: true,
					title: true,
					status: true,
					total: true,
				},
			},
			contracts: {
				orderBy: { createdAt: "desc" },
				take: 10,
				select: {
					id: true,
					number: true,
					title: true,
					status: true,
				},
			},
			activities: {
				include: {
					user: { select: { name: true, email: true } },
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			},
		},
	});

	if (!company || company.type !== "CUSTOMER") {
		throw error(404, "Kund hittades inte");
	}

	return { company };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}

		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		const email = (data.get("email") as string)?.trim() || undefined;
		const phone = (data.get("phone") as string)?.trim() || undefined;
		const industry = (data.get("industry") as string)?.trim() || undefined;
		const website = (data.get("website") as string)?.trim() || undefined;

		if (!name) {
			return { error: "Företagsnamn krävs" };
		}

		await db.company.update({
			where: { id: params.id },
			data: {
				name,
				email,
				phone,
				industry,
				website,
			},
		});

		await db.activity.create({
			data: {
				type: "UPDATED",
				title: "Kund uppdaterad",
				companyId: params.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "customer.update",
			entityType: "Company",
			entityId: params.id,
			details: { name },
			request,
		});

		return { success: true };
	},
};
