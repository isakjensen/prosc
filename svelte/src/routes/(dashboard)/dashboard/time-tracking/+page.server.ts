import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		return { entries: [], projects: [], users: [], tasks: [], currentUser: null, isAdmin: false, totalHours: 0, byProject: [] };
	}
	const projectId = url.searchParams.get("projectId") ?? undefined;
	const userId = url.searchParams.get("userId") ?? undefined;
	const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
	const dateTo = url.searchParams.get("dateTo") ?? undefined;

	const isAdmin = locals.user.role === "ADMIN";
	const filterUserId = userId || (!isAdmin ? locals.user.id : undefined);

	const entries = await db.timeEntry.findMany({
		where: {
			...(filterUserId && { userId: filterUserId }),
			...(projectId && { projectId }),
			...(dateFrom && { date: { gte: new Date(dateFrom) } }),
			...(dateTo && { date: { lte: new Date(dateTo + "T23:59:59") } }),
		},
		include: {
			user: { select: { id: true, name: true } },
			project: { select: { id: true, name: true } },
			task: { select: { id: true, title: true } },
		},
		orderBy: [{ date: "desc" }, { createdAt: "desc" }],
	});

	const projects = await db.project.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const users = await db.user.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const tasks = await db.task.findMany({
		select: { id: true, title: true, projectId: true },
		orderBy: { title: "asc" },
	});

	const totalHours = entries.reduce((s, e) => s + e.hours, 0);
	const byProject = entries.reduce((acc, e) => {
		const key = e.project?.name ?? "Inget projekt";
		acc[key] = (acc[key] ?? 0) + e.hours;
		return acc;
	}, {} as Record<string, number>);

	return {
		entries,
		projects,
		users,
		tasks,
		currentUser: locals.user,
		isAdmin,
		totalHours,
		byProject: Object.entries(byProject).map(([name, hours]) => ({ name, hours })),
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const projectId = (data.get("projectId") as string) || undefined;
		const taskId = (data.get("taskId") as string) || undefined;
		const description = (data.get("description") as string)?.trim();
		const hours = parseFloat((data.get("hours") as string) || "0");
		const dateRaw = data.get("date") as string;
		const billable = (data.get("billable") as string) === "on" || (data.get("billable") as string) === "true";

		if (!description) {
			return fail(400, { error: "Beskrivning krävs" });
		}
		if (hours <= 0) {
			return fail(400, { error: "Timmar måste vara större än 0" });
		}

		const date = dateRaw ? new Date(dateRaw) : new Date();
		const entry = await db.timeEntry.create({
			data: {
				userId: locals.user.id,
				projectId: projectId || null,
				taskId: taskId || null,
				description,
				hours,
				date,
				billable,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "timeEntry.create",
			entityType: "TimeEntry",
			entityId: entry.id,
			details: { description, hours, date: date.toISOString().slice(0, 10), billable },
			request,
		});
		return { success: true };
	},

	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const id = (await request.formData()).get("id") as string;
		if (!id) return fail(400, { error: "Id krävs" });

		const entry = await db.timeEntry.findUnique({ where: { id } });
		if (!entry || (entry.userId !== locals.user.id && locals.user.role !== "ADMIN")) {
			return fail(403, { error: "Du kan inte redigera denna post" });
		}

		const data = await request.formData();
		const projectId = (data.get("projectId") as string) || undefined;
		const taskId = (data.get("taskId") as string) || undefined;
		const description = (data.get("description") as string)?.trim();
		const hours = parseFloat((data.get("hours") as string) || "0");
		const dateRaw = data.get("date") as string;
		const billable = (data.get("billable") as string) === "on" || (data.get("billable") as string) === "true";

		if (!description) return fail(400, { error: "Beskrivning krävs" });
		if (hours <= 0) return fail(400, { error: "Timmar måste vara större än 0" });

		const date = dateRaw ? new Date(dateRaw) : entry.date;
		await db.timeEntry.update({
			where: { id },
			data: {
				projectId: projectId || null,
				taskId: taskId || null,
				description,
				hours,
				date,
				billable,
			},
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "timeEntry.update",
			entityType: "TimeEntry",
			entityId: id,
			details: { description, hours, date: date.toISOString().slice(0, 10) },
			request,
		});
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const id = (await request.formData()).get("id") as string;
		if (!id) return fail(400, { error: "Id krävs" });

		const entry = await db.timeEntry.findUnique({ where: { id } });
		if (!entry || (entry.userId !== locals.user.id && locals.user.role !== "ADMIN")) {
			return fail(403, { error: "Du kan inte ta bort denna post" });
		}
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "timeEntry.delete",
			entityType: "TimeEntry",
			entityId: id,
			details: { description: entry.description, hours: entry.hours },
			request,
		});
		await db.timeEntry.delete({ where: { id } });
		return { success: true };
	},
};
