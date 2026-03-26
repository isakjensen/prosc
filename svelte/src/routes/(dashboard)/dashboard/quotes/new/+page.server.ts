import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { getNextQuoteNumber } from "$lib/server/numbers.js";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	const companies = await db.company.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
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
		const title = data.get("title") as string;
		const validUntilRaw = data.get("validUntil") as string;
		const notes = (data.get("notes") as string) || undefined;

		if (!companyId || !title?.trim()) {
			return fail(400, { error: "Företag och titel krävs" });
		}

		const number = await getNextQuoteNumber(db);
		const validUntil = validUntilRaw ? new Date(validUntilRaw) : undefined;

		const quote = await db.quote.create({
			data: {
				companyId,
				number,
				title: title.trim(),
				status: "DRAFT",
				validUntil,
				notes,
				subtotal: 0,
				tax: 0,
				total: 0,
			},
		});

		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Offert skapad",
				description: `Offert ${quote.number}: ${quote.title}`,
				companyId: quote.companyId,
				quoteId: quote.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "quote.create",
			entityType: "Quote",
			entityId: quote.id,
			details: { number: quote.number, title: quote.title, companyId: quote.companyId },
			request,
		});

		throw redirect(303, `/dashboard/quotes/${quote.id}`);
	},
};
