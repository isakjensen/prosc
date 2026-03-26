import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get("status") ?? undefined;
	const priorityFilter = url.searchParams.get("priority") ?? undefined;

	const tickets = await db.supportTicket.findMany({
		where: {
			...(statusFilter && { status: statusFilter as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" }),
			...(priorityFilter && { priority: priorityFilter as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }),
		},
		include: {
			company: { select: { id: true, name: true } },
			creator: { select: { id: true, name: true } },
			assignee: { select: { id: true, name: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	const companies = await db.company.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	return { tickets, companies };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const companyId = data.get("companyId") as string;
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim();
		const priority = (data.get("priority") as string) || "MEDIUM";

		if (!companyId || !title || !description) {
			return fail(400, { error: "Företag, titel och beskrivning krävs" });
		}

		const ticket = await db.supportTicket.create({
			data: {
				companyId,
				title,
				description,
				priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
				createdById: locals.user.id,
			},
		});

		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Supportärende skapat",
				description: ticket.title,
				companyId: ticket.companyId,
				ticketId: ticket.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "support_ticket.create",
			entityType: "SupportTicket",
			entityId: ticket.id,
			details: { title: ticket.title, companyId: ticket.companyId, priority: ticket.priority },
			request,
		});

		return { success: true, ticketId: ticket.id };
	},
};
