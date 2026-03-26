import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const STATUS_LABELS: Record<string, string> = {
	TODO: "Att göra",
	IN_PROGRESS: "Pågår",
	REVIEW: "Granskning",
	DONE: "Klar",
	CANCELLED: "Avbruten",
};
const PRIORITY_LABELS: Record<string, string> = {
	LOW: "Låg",
	MEDIUM: "Medium",
	HIGH: "Hög",
	URGENT: "Brådskande",
};

export const load: PageServerLoad = async ({ params }) => {
	const task = await db.task.findUnique({
		where: { id: params.id },
		include: {
			assignee: { select: { id: true, name: true, email: true } },
			project: {
				select: {
					id: true,
					name: true,
					company: {
						select: {
							id: true,
							name: true,
							type: true,
						},
					},
				},
			},
			comments: {
				include: {
					user: { select: { id: true, name: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});
	if (!task) {
		throw error(404, "Uppgift hittades inte");
	}
	const users = await db.user.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const projects = await db.project.findMany({
		select: {
			id: true,
			name: true,
			company: { select: { name: true } },
		},
		orderBy: { name: "asc" },
	});
	return {
		task,
		users,
		projects,
		statusLabels: STATUS_LABELS,
		priorityLabels: PRIORITY_LABELS,
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim() || undefined;
		const status = data.get("status") as string;
		const priority = data.get("priority") as string;
		const assignedTo = (data.get("assignedTo") as string) || undefined;
		const projectId = (data.get("projectId") as string) || undefined;
		const dueDateRaw = data.get("dueDate") as string;

		if (!title) {
			return { error: "Titel krävs" };
		}

		const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

		const existing = await db.task.findUnique({ where: { id: params.id }, select: { status: true } });
		const completedAt = status === "DONE" ? new Date() : existing?.status === "DONE" ? null : undefined;

		await db.task.update({
			where: { id: params.id },
			data: {
				title,
				description,
				status: (status || undefined) as import("@prisma/client").TaskStatus | undefined,
				priority: (priority || undefined) as import("@prisma/client").TaskPriority | undefined,
				assignedTo,
				projectId: projectId || null,
				dueDate,
				...(completedAt !== undefined && { completedAt }),
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "task.update",
			entityType: "Task",
			entityId: params.id,
			details: { title, status, priority },
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
		await db.taskComment.create({
			data: {
				taskId: params.id,
				userId: locals.user.id,
				content,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "task.addComment",
			entityType: "Task",
			entityId: params.id,
			details: { contentLength: content.length },
			request,
		});
		return { success: true };
	},
};
