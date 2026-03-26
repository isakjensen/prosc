import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { getNextInvoiceNumber } from "$lib/server/numbers.js";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { companies: [], projects: [], quotes: [] };
	}
	const companies = await db.company.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const projects = await db.project.findMany({
		select: { id: true, name: true, companyId: true },
		orderBy: { name: "asc" },
	});
	const quotes = await db.quote.findMany({
		where: { status: "ACCEPTED" },
		include: { company: { select: { id: true, name: true } }, lineItems: true },
		orderBy: { createdAt: "desc" },
	});
	return { companies, projects, quotes };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const companyId = data.get("companyId") as string;
		const projectId = (data.get("projectId") as string) || undefined;
		const title = (data.get("title") as string)?.trim();
		const dueDateRaw = data.get("dueDate") as string;
		const quoteId = (data.get("quoteId") as string) || undefined;

		if (!companyId || !title) {
			return fail(400, { error: "Företag och titel krävs" });
		}

		const number = await getNextInvoiceNumber(db);
		const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;

		const invoice = await db.invoice.create({
			data: {
				companyId,
				projectId: projectId || null,
				number,
				title,
				status: "DRAFT",
				dueDate,
				subtotal: 0,
				tax: 0,
				total: 0,
				paidAmount: 0,
			},
		});

		if (quoteId) {
			const quote = await db.quote.findUnique({
				where: { id: quoteId },
				include: { lineItems: true },
			});
			if (quote && quote.companyId === companyId) {
				for (const item of quote.lineItems) {
					await db.invoiceLineItem.create({
						data: {
							invoiceId: invoice.id,
							description: item.description,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							total: item.total,
						},
					});
				}
				const subtotal = quote.lineItems.reduce((s, i) => s + i.total, 0);
				const tax = 0;
				const total = subtotal + tax;
				await db.invoice.update({
					where: { id: invoice.id },
					data: { subtotal, tax, total },
				});
			}
		}

		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Faktura skapad",
				description: `Faktura ${invoice.number}: ${invoice.title}`,
				companyId: invoice.companyId,
				invoiceId: invoice.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "invoice.create",
			entityType: "Invoice",
			entityId: invoice.id,
			details: { number: invoice.number, title: invoice.title, companyId: invoice.companyId },
			request,
		});

		throw redirect(303, `/dashboard/invoices/${invoice.id}`);
	},
};
