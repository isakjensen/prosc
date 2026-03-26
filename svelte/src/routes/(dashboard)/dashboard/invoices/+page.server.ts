import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get("status") ?? undefined;
	const invoices = await db.invoice.findMany({
		where: statusFilter ? { status: statusFilter as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" } : undefined,
		include: {
			company: { select: { id: true, name: true } },
			project: { select: { id: true, name: true } },
			lineItems: true,
		},
		orderBy: { createdAt: "desc" },
	});
	const companies = await db.company.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	return { invoices, companies };
};
