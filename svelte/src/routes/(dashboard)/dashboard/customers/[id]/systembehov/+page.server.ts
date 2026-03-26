import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ params }) => {
	const company = await db.company.findUnique({
		where: { id: params.id },
		include: {
			systemRequirement: {
				include: {
					features: {
						include: { subtasks: { orderBy: { order: "asc" } } },
						orderBy: [{ priority: "desc" }, { order: "asc" }],
					},
					updates: { orderBy: { createdAt: "desc" } },
				},
			},
		},
	});

	if (!company || company.type !== "CUSTOMER") {
		throw error(404, "Kund hittades inte");
	}

	// Ensure system requirement exists for this customer
	let requirement = company.systemRequirement;
	if (!requirement) {
		requirement = await db.systemRequirement.create({
			data: { companyId: company.id },
			include: {
				features: {
					include: { subtasks: { orderBy: { order: "asc" } } },
					orderBy: [{ priority: "desc" }, { order: "asc" }],
				},
				updates: { orderBy: { createdAt: "desc" } },
			},
		});
	}

	return { company: { ...company, systemRequirement: requirement } };
};

export const actions: Actions = {
	updateDesign: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const designNotes = (data.get("designNotes") as string)?.trim() || null;
		const colorTheme = (data.get("colorTheme") as string)?.trim() || null;
		const typography = (data.get("typography") as string)?.trim() || null;
		const logoPaths = (data.get("logoPaths") as string)?.trim() || null;

		const existing = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
		});
		if (!existing) {
			await db.systemRequirement.create({
				data: {
					companyId: params.id,
					designNotes,
					colorTheme,
					typography,
					logoPaths,
				},
			});
		} else {
			await db.systemRequirement.update({
				where: { id: existing.id },
				data: { designNotes, colorTheme, typography, logoPaths },
			});
		}

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "systembehov.updateDesign",
			entityType: "SystemRequirement",
			entityId: params.id,
			request,
		});
		return { success: true };
	},

	createFeature: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		if (!name) return { error: "Funktionsnamn krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const count = await db.systemFeature.count({ where: { requirementId: requirement.id } });
		const status = (data.get("status") as string) || "PLANNING";
		const priority = (data.get("priority") as string) || "MEDIUM";

		await db.systemFeature.create({
			data: {
				requirementId: requirement.id,
				name,
				description: (data.get("description") as string)?.trim() || null,
				status: status as "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED",
				priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
				order: count,
			},
		});
		return { success: true };
	},

	updateFeature: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const featureId = data.get("featureId") as string;
		if (!featureId) return { error: "featureId krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const name = (data.get("name") as string)?.trim();
		if (!name) return { error: "Funktionsnamn krävs" };

		await db.systemFeature.update({
			where: { id: featureId },
			data: {
				name,
				description: (data.get("description") as string)?.trim() || null,
				status: (data.get("status") as string) as "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED",
				priority: (data.get("priority") as string) as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
			},
		});
		return { success: true };
	},

	deleteFeature: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const featureId = data.get("featureId") as string;
		if (!featureId) return { error: "featureId krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const feature = await db.systemFeature.findFirst({
			where: { id: featureId, requirementId: requirement.id },
		});
		if (!feature) return { error: "Funktion hittades inte" };

		await db.systemFeature.delete({ where: { id: featureId } });
		return { success: true };
	},

	createSubtask: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const featureId = data.get("featureId") as string;
		const title = (data.get("title") as string)?.trim();
		if (!featureId || !title) return { error: "Funktion och titel krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
			include: { features: { where: { id: featureId } } },
		});
		if (!requirement || requirement.features.length === 0) return { error: "Funktion hittades inte" };

		const order = await db.systemSubtask.count({ where: { featureId } });
		await db.systemSubtask.create({
			data: { featureId, title, order },
		});
		return { success: true };
	},

	toggleSubtask: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const subtaskId = data.get("subtaskId") as string;
		if (!subtaskId) return { error: "subtaskId krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
			include: { features: { include: { subtasks: true } } },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const subtask = requirement.features.flatMap((f) => f.subtasks).find((s) => s.id === subtaskId);
		if (!subtask) return { error: "Subtask hittades inte" };

		const completed = !subtask.completed;
		await db.systemSubtask.update({
			where: { id: subtaskId },
			data: { completed, completedAt: completed ? new Date() : null },
		});
		return { success: true };
	},

	deleteSubtask: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const subtaskId = data.get("subtaskId") as string;
		if (!subtaskId) return { error: "subtaskId krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
			include: { features: { include: { subtasks: true } } },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const subtask = requirement.features.flatMap((f) => f.subtasks).find((s) => s.id === subtaskId);
		if (!subtask) return { error: "Subtask hittades inte" };

		await db.systemSubtask.delete({ where: { id: subtaskId } });
		return { success: true };
	},

	createUpdate: async ({ request, params, locals }) => {
		if (!locals.user) return { error: "Du måste vara inloggad" };

		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		if (!title) return { error: "Titel krävs" };

		const requirement = await db.systemRequirement.findUnique({
			where: { companyId: params.id },
		});
		if (!requirement) return { error: "Systembehov hittades inte" };

		const description = (data.get("description") as string)?.trim() || null;
		const featureId = (data.get("featureId") as string)?.trim() || null;
		let imagePaths: string | null = null;
		let commitLinks: string | null = null;
		try {
			const imgs = data.get("imagePaths") as string;
			if (imgs?.trim()) imagePaths = imgs.trim();
		} catch {}
		try {
			const links = data.get("commitLinks") as string;
			if (links?.trim()) commitLinks = links.trim();
		} catch {}

		await db.systemUpdate.create({
			data: {
				requirementId: requirement.id,
				featureId: featureId || undefined,
				title,
				description,
				imagePaths,
				commitLinks,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "systembehov.createUpdate",
			entityType: "SystemUpdate",
			entityId: requirement.id,
			details: { title },
			request,
		});
		return { success: true };
	},
};
