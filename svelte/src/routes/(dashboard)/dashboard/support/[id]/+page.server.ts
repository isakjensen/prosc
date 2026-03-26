import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const STATUS_LABELS: Record<string, string> = {
	OPEN: "Öppen",
	IN_PROGRESS: "Pågår",
	RESOLVED: "Löst",
	CLOSED: "Stängd",
};
const PRIORITY_LABELS: Record<string, string> = {
	LOW: "Låg",
	MEDIUM: "Medium",
	HIGH: "Hög",
	URGENT: "Brådskande",
};

export const load: PageServerLoad = async ({ params }) => {
	const ticket = await db.supportTicket.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true } },
			creator: { select: { id: true, name: true, email: true } },
			assignee: { select: { id: true, name: true } },
			comments: {
				include: { user: { select: { id: true, name: true } } },
				orderBy: { createdAt: "asc" },
			},
		},
	});
	if (!ticket) {
		throw error(404, "Ärende hittades inte");
	}
	const users = await db.user.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	return { ticket, users, statusLabels: STATUS_LABELS, priorityLabels: PRIORITY_LABELS };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim();
		const status = data.get("status") as string;
		const priority = data.get("priority") as string;
		const assignedToId = (data.get("assignedToId") as string) || undefined;

		if (!title) {
			return { error: "Titel krävs" };
		}

		await db.supportTicket.update({
			where: { id: params.id },
			data: {
				title,
				description: description ?? undefined,
				status: (status || undefined) as import("@prisma/client").TicketStatus | undefined,
				priority: (priority || undefined) as import("@prisma/client").TicketPriority | undefined,
				assignedToId: assignedToId || null,
				...(status === "RESOLVED" || status === "CLOSED" ? { resolvedAt: new Date() } : {}),
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "support_ticket.update",
			entityType: "SupportTicket",
			entityId: params.id,
			details: { title, status },
			request,
		});
		return { success: true };
	},

	addComment: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const content = (data.get("content") as string)?.trim();
		if (!content) {
			return { error: "Kommentar krävs" };
		}
		await db.ticketComment.create({
			data: {
				ticketId: params.id,
				userId: locals.user.id,
				content,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "support_ticket.addComment",
			entityType: "SupportTicket",
			entityId: params.id,
			details: { contentLength: content.length },
			request,
		});
		return { success: true };
	},
};
