import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ locals, url }) => {
	const projectId = url.searchParams.get("projectId") ?? undefined;
	const assignedTo = url.searchParams.get("assignedTo") ?? undefined;
	const statusFilter = url.searchParams.get("status") ?? undefined;

	const tasks = await db.task.findMany({
		where: {
			...(projectId && { projectId }),
			...(assignedTo && { assignedTo }),
			...(statusFilter && { status: statusFilter as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED" }),
		},
		include: {
			assignee: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			project: {
				select: {
					id: true,
					name: true,
					company: {
						select: {
							name: true,
						},
					},
				},
			},
			_count: {
				select: {
					comments: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
	
	const users = await db.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
		},
	});
	
	const projects = await db.project.findMany({
		select: {
			id: true,
			name: true,
			company: {
				select: {
					name: true,
				},
			},
		},
	});
	
	return {
		tasks,
		users,
		projects,
	};
};
