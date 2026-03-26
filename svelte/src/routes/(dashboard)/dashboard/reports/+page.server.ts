import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const REPORT_TYPES = [
	{ id: "REVENUE", label: "Intäkter och betalningar" },
	{ id: "TIME_TRACKING", label: "Tidrapportering" },
	{ id: "SUPPORT_TICKETS", label: "Supportärenden" },
	{ id: "INVOICES", label: "Fakturor" },
	{ id: "QUOTES", label: "Offerter" },
] as const;

export const load: PageServerLoad = async () => {
	return { reportTypes: REPORT_TYPES };
};

export const actions: Actions = {
	run: async ({ request, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad", data: null };
		}
		const data = await request.formData();
		const type = data.get("type") as string;
		const dateFrom = data.get("dateFrom") as string;
		const dateTo = data.get("dateTo") as string;

		if (!type) {
			return { error: "Välj rapporttyp", data: null };
		}

		const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
		const to = dateTo ? new Date(dateTo + "T23:59:59") : new Date();

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "report.run",
			entityType: "Report",
			details: { type, dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) },
			request,
		});

		if (type === "REVENUE") {
			const invoices = await db.invoice.findMany({
				where: { issueDate: { gte: from, lte: to } },
				include: { company: { select: { name: true } } },
			});
			const payments = await db.payment.findMany({
				where: { paidAt: { gte: from, lte: to } },
				include: { invoice: { select: { number: true } } },
			});
			const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
			const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
			return {
				data: {
					summary: { totalInvoiced, totalPaid, invoiceCount: invoices.length, paymentCount: payments.length },
					invoices: invoices.map((i) => ({ number: i.number, company: i.company.name, total: i.total, status: i.status })),
					payments: payments.map((p) => ({ invoiceNumber: p.invoice.number, amount: p.amount, paidAt: p.paidAt })),
				},
				error: null,
			};
		}

		if (type === "TIME_TRACKING") {
			const entries = await db.timeEntry.findMany({
				where: { date: { gte: from, lte: to } },
				include: {
					user: { select: { name: true } },
					project: { select: { name: true } },
				},
			});
			const totalHours = entries.reduce((s, e) => s + e.hours, 0);
			const byProject = entries.reduce((acc, e) => {
				const key = e.project?.name ?? "Inget projekt";
				acc[key] = (acc[key] ?? 0) + e.hours;
				return acc;
			}, {} as Record<string, number>);
			return {
				data: {
					summary: { totalHours, entryCount: entries.length },
					byProject: Object.entries(byProject).map(([name, hours]) => ({ name, hours })),
					entries: entries.slice(0, 100).map((e) => ({ date: e.date, user: e.user.name, project: e.project?.name, description: e.description, hours: e.hours })),
				},
				error: null,
			};
		}

		if (type === "SUPPORT_TICKETS") {
			const tickets = await db.supportTicket.findMany({
				where: { createdAt: { gte: from, lte: to } },
				include: { company: { select: { name: true } }, assignee: { select: { name: true } } },
			});
			const byStatus = tickets.reduce((acc, t) => {
				acc[t.status] = (acc[t.status] ?? 0) + 1;
				return acc;
			}, {} as Record<string, number>);
			return {
				data: {
					summary: { total: tickets.length, byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })) },
					tickets: tickets.map((t) => ({ title: t.title, company: t.company.name, status: t.status, priority: t.priority, assignee: t.assignee?.name })),
				},
				error: null,
			};
		}

		if (type === "INVOICES") {
			const invoices = await db.invoice.findMany({
				where: { issueDate: { gte: from, lte: to } },
				include: { company: { select: { name: true } } },
			});
			const byStatus = invoices.reduce((acc, i) => {
				acc[i.status] = (acc[i.status] ?? 0) + 1;
				return acc;
			}, {} as Record<string, number>);
			return {
				data: {
					summary: { total: invoices.length, totalAmount: invoices.reduce((s, i) => s + i.total, 0), byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })) },
					invoices: invoices.map((i) => ({ number: i.number, company: i.company.name, total: i.total, status: i.status, issueDate: i.issueDate })),
				},
				error: null,
			};
		}

		if (type === "QUOTES") {
			const quotes = await db.quote.findMany({
				where: { createdAt: { gte: from, lte: to } },
				include: { company: { select: { name: true } } },
			});
			const byStatus = quotes.reduce((acc, q) => {
				acc[q.status] = (acc[q.status] ?? 0) + 1;
				return acc;
			}, {} as Record<string, number>);
			return {
				data: {
					summary: { total: quotes.length, totalValue: quotes.reduce((s, q) => s + q.total, 0), byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })) },
					quotes: quotes.map((q) => ({ number: q.number, company: q.company.name, total: q.total, status: q.status, createdAt: q.createdAt })),
				},
				error: null,
			};
		}

		return { error: "Okänd rapporttyp", data: null };
	},
};
