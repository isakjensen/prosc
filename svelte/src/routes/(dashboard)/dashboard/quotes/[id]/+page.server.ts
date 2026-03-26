import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const STATUS_LABELS: Record<string, string> = {
	DRAFT: "Utkast",
	SENT: "Skickad",
	ACCEPTED: "Accepterad",
	REJECTED: "Avslagen",
	EXPIRED: "Utgången",
};

export const load: PageServerLoad = async ({ params }) => {
	const quote = await db.quote.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true } },
			lineItems: true,
		},
	});
	if (!quote) {
		throw error(404, "Offert hittades inte");
	}
	return {
		quote,
		statusLabels: STATUS_LABELS,
	};
};

function recalcQuoteTotals(quoteId: string) {
	return db.$transaction(async (tx) => {
		const items = await tx.quoteLineItem.findMany({
			where: { quoteId },
		});
		const subtotal = items.reduce((sum, i) => sum + i.total, 0);
		const tax = 0;
		const total = subtotal + tax;
		await tx.quote.update({
			where: { id: quoteId },
			data: { subtotal, tax, total },
		});
	});
}

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const status = data.get("status") as string;
		const validUntilRaw = data.get("validUntil") as string;
		const notes = (data.get("notes") as string) || undefined;

		if (!title) {
			return { error: "Titel krävs" };
		}

		const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
		await db.quote.update({
			where: { id: params.id },
			data: {
				title,
				status: (status || undefined) as import("@prisma/client").QuoteStatus | undefined,
				validUntil,
				notes,
			},
		});

		await db.activity.create({
			data: {
				type: "UPDATED",
				title: "Offert uppdaterad",
				quoteId: params.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "quote.update",
			entityType: "Quote",
			entityId: params.id,
			details: { title, status },
			request,
		});

		return { success: true };
	},

	addLineItem: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const description = (data.get("description") as string)?.trim();
		const quantity = parseFloat((data.get("quantity") as string) || "1");
		const unitPrice = parseFloat((data.get("unitPrice") as string) || "0");

		if (!description) {
			return { error: "Beskrivning krävs" };
		}

		const total = quantity * unitPrice;
		await db.quoteLineItem.create({
			data: {
				quoteId: params.id,
				description,
				quantity,
				unitPrice,
				total,
			},
		});
		await recalcQuoteTotals(params.id);
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "quote.addLineItem",
			entityType: "Quote",
			entityId: params.id,
			details: { description, quantity, unitPrice, total },
			request,
		});
		return { success: true };
	},

	removeLineItem: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const lineItemId = data.get("lineItemId") as string;
		if (!lineItemId) {
			return { error: "Rad krävs" };
		}
		await db.quoteLineItem.deleteMany({
			where: { id: lineItemId, quoteId: params.id },
		});
		await recalcQuoteTotals(params.id);
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "quote.removeLineItem",
			entityType: "Quote",
			entityId: params.id,
			details: { lineItemId },
			request,
		});
		return { success: true };
	},
};
