import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	const users = await db.user.findMany({
		select: { id: true, name: true, email: true },
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
	return { users, projects };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}

		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const description = (data.get("description") as string)?.trim() || undefined;
		const status = (data.get("status") as string) || "TODO";
		const priority = (data.get("priority") as string) || "MEDIUM";
		const assignedTo = (data.get("assignedTo") as string) || undefined;
		const projectId = (data.get("projectId") as string) || undefined;
		const dueDateRaw = data.get("dueDate") as string;

		if (!title) {
			return fail(400, { error: "Titel krävs" });
		}

		const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;

		const task = await db.task.create({
			data: {
				title,
				description,
				status: status as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED",
				priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
				assignedTo,
				projectId,
				dueDate,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "task.create",
			entityType: "Task",
			entityId: task.id,
			details: { title, status, priority },
			request,
		});

		throw redirect(303, `/dashboard/tasks/${task.id}`);
	},
};
