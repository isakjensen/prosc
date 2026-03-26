import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const STATUS_LABELS: Record<string, string> = {
	DRAFT: "Utkast",
	SENT: "Skickad",
	PAID: "Betald",
	OVERDUE: "Förfallen",
	CANCELLED: "Avbruten",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	BANK_TRANSFER: "Banköverföring",
	CREDIT_CARD: "Kort",
	CHECK: "Check",
	CASH: "Kontant",
	PAYPAL: "PayPal",
	STRIPE: "Stripe",
	OTHER: "Övrigt",
};

export const load: PageServerLoad = async ({ params }) => {
	const invoice = await db.invoice.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true, address: true, city: true, zip: true, country: true } },
			project: { select: { id: true, name: true } },
			lineItems: true,
			payments: true,
		},
	});
	if (!invoice) {
		throw error(404, "Faktura hittades inte");
	}
	return {
		invoice,
		statusLabels: STATUS_LABELS,
		paymentMethodLabels: PAYMENT_METHOD_LABELS,
	};
};

async function recalcInvoiceTotals(invoiceId: string) {
	const items = await db.invoiceLineItem.findMany({ where: { invoiceId } });
	const subtotal = items.reduce((s, i) => s + i.total, 0);
	const inv = await db.invoice.findUnique({ where: { id: invoiceId }, select: { tax: true } });
	const tax = inv?.tax ?? 0;
	const total = subtotal + tax;
	await db.invoice.update({
		where: { id: invoiceId },
		data: { subtotal, total },
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
		const dueDateRaw = data.get("dueDate") as string;
		const notes = (data.get("notes") as string) || undefined;

		if (!title) {
			return { error: "Titel krävs" };
		}

		const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
		await db.invoice.update({
			where: { id: params.id },
			data: { title, status: (status || undefined) as import("@prisma/client").InvoiceStatus | undefined, dueDate, notes },
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "invoice.update",
			entityType: "Invoice",
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
		await db.invoiceLineItem.create({
			data: {
				invoiceId: params.id,
				description,
				quantity,
				unitPrice,
				total,
			},
		});
		await recalcInvoiceTotals(params.id);
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "invoice.addLineItem",
			entityType: "Invoice",
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
		await db.invoiceLineItem.deleteMany({
			where: { id: lineItemId, invoiceId: params.id },
		});
		await recalcInvoiceTotals(params.id);
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "invoice.removeLineItem",
			entityType: "Invoice",
			entityId: params.id,
			details: { lineItemId },
			request,
		});
		return { success: true };
	},

	addPayment: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const amount = parseFloat((data.get("amount") as string) || "0");
		const method = data.get("method") as string;
		const reference = (data.get("reference") as string)?.trim() || undefined;
		const paidAtRaw = data.get("paidAt") as string;

		if (amount <= 0) {
			return { error: "Belopp måste vara större än 0" };
		}

		const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
		await db.payment.create({
			data: {
				invoiceId: params.id,
				amount,
				method: (method as "BANK_TRANSFER" | "CREDIT_CARD" | "CHECK" | "CASH" | "PAYPAL" | "STRIPE" | "OTHER") || "OTHER",
				reference,
				paidAt,
			},
		});

		const payments = await db.payment.findMany({ where: { invoiceId: params.id }, select: { amount: true } });
		const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
		const inv = await db.invoice.findUnique({ where: { id: params.id }, select: { total: true } });
		const status = inv && paidAmount >= inv.total ? "PAID" : "SENT";
		await db.invoice.update({
			where: { id: params.id },
			data: { paidAmount, status },
		});

		await db.activity.create({
			data: {
				type: "PAYMENT_RECEIVED",
				title: "Betalning registrerad",
				description: `${amount} kr`,
				invoiceId: params.id,
				userId: locals.user.id,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "invoice.addPayment",
			entityType: "Invoice",
			entityId: params.id,
			details: { amount, method, reference: reference ?? undefined },
			request,
		});
		return { success: true };
	},
};
