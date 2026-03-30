import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { fail, error } from "@sveltejs/kit";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ params }) => {
	const product = await db.product.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true } },
			features: {
				include: { subtasks: { orderBy: { order: "asc" } } },
				orderBy: { order: "asc" },
			},
			boardColumns: {
				include: { cards: { orderBy: { order: "asc" } } },
				orderBy: { order: "asc" },
			},
			financeEntries: { orderBy: { createdAt: "desc" } },
		},
	});

	if (!product) {
		error(404, "Produkten hittades inte");
	}

	return { product };
};

export const actions: Actions = {
	// ── Features ──────────────────────────────────────────
	createFeature: async ({ request, params, locals }) => {
		const fd = await request.formData();
		const name = (fd.get("name") as string)?.trim();
		const description = (fd.get("description") as string) || null;
		if (!name) return fail(400, { error: "Namn krävs" });

		const count = await db.productFeature.count({ where: { productId: params.id } });
		await db.productFeature.create({
			data: { productId: params.id, name, description, order: count },
		});

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.feature.create",
			entityId: params.id,
			request,
		});
		return { success: true };
	},

	updateFeature: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		const name = (fd.get("name") as string)?.trim();
		const description = (fd.get("description") as string) || null;
		const status = fd.get("status") as string;
		const priority = fd.get("priority") as string;
		if (!id || !name) return fail(400, { error: "Ogiltiga värden" });

		await db.productFeature.update({
			where: { id },
			data: { name, description, status: status as any, priority: priority as any },
		});

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.feature.update",
			entityId: params.id,
			request,
		});
		return { success: true };
	},

	deleteFeature: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });

		await db.productFeature.delete({ where: { id } });

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.feature.delete",
			entityId: params.id,
			request,
		});
		return { success: true };
	},

	createSubtask: async ({ request, params, locals }) => {
		const fd = await request.formData();
		const featureId = fd.get("featureId") as string;
		const title = (fd.get("title") as string)?.trim();
		if (!featureId || !title) return fail(400, { error: "Ogiltiga värden" });

		const count = await db.productSubtask.count({ where: { featureId } });
		await db.productSubtask.create({
			data: { featureId, title, order: count },
		});
		return { success: true };
	},

	toggleSubtask: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });

		const subtask = await db.productSubtask.findUnique({ where: { id } });
		if (!subtask) return fail(404, { error: "Hittades inte" });

		await db.productSubtask.update({
			where: { id },
			data: {
				completed: !subtask.completed,
				completedAt: subtask.completed ? null : new Date(),
			},
		});
		return { success: true };
	},

	deleteSubtask: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });
		await db.productSubtask.delete({ where: { id } });
		return { success: true };
	},

	// ── Board ────────────────────────────────────────────
	createCard: async ({ request, params }) => {
		const fd = await request.formData();
		const columnId = fd.get("columnId") as string;
		const title = (fd.get("title") as string)?.trim();
		const description = (fd.get("description") as string) || null;
		const priority = (fd.get("priority") as string) || "MEDIUM";
		const dueDateStr = fd.get("dueDate") as string;
		if (!columnId || !title) return fail(400, { error: "Titel krävs" });

		const count = await db.productBoardCard.count({ where: { columnId } });
		await db.productBoardCard.create({
			data: {
				columnId,
				title,
				description,
				priority: priority as any,
				dueDate: dueDateStr ? new Date(dueDateStr) : null,
				order: count,
			},
		});
		return { success: true };
	},

	updateCard: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		const title = (fd.get("title") as string)?.trim();
		const description = (fd.get("description") as string) || null;
		const priority = (fd.get("priority") as string) || "MEDIUM";
		const dueDateStr = fd.get("dueDate") as string;
		if (!id || !title) return fail(400, { error: "Ogiltiga värden" });

		await db.productBoardCard.update({
			where: { id },
			data: {
				title,
				description,
				priority: priority as any,
				dueDate: dueDateStr ? new Date(dueDateStr) : null,
			},
		});
		return { success: true };
	},

	deleteCard: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });
		await db.productBoardCard.delete({ where: { id } });
		return { success: true };
	},

	moveCard: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		const columnId = fd.get("columnId") as string;
		const order = parseInt(fd.get("order") as string, 10);
		if (!id || !columnId || isNaN(order)) return fail(400, { error: "Ogiltiga värden" });

		await db.productBoardCard.update({
			where: { id },
			data: { columnId, order },
		});
		return { success: true };
	},

	createColumn: async ({ request, params }) => {
		const fd = await request.formData();
		const name = (fd.get("name") as string)?.trim();
		if (!name) return fail(400, { error: "Namn krävs" });

		const count = await db.productBoardColumn.count({ where: { productId: params.id } });
		await db.productBoardColumn.create({
			data: { productId: params.id, name, order: count },
		});
		return { success: true };
	},

	deleteColumn: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });
		await db.productBoardColumn.delete({ where: { id } });
		return { success: true };
	},

	// ── Finance ──────────────────────────────────────────
	createFinanceEntry: async ({ request, params, locals }) => {
		const fd = await request.formData();
		const type = fd.get("type") as string;
		const description = (fd.get("description") as string)?.trim();
		const amountStr = fd.get("amount") as string;
		const vatRateStr = fd.get("vatRate") as string;
		const inclVat = fd.get("inclVat") === "true";
		const isRecurring = fd.get("isRecurring") === "true";
		const category = (fd.get("category") as string) || null;
		const startDateStr = fd.get("startDate") as string;
		const endDateStr = fd.get("endDate") as string;

		if (!type || !description || !amountStr) {
			return fail(400, { error: "Fyll i alla obligatoriska fält" });
		}

		const vatRate = parseFloat(vatRateStr) || 0.25;
		let amount = parseFloat(amountStr);
		if (isNaN(amount)) return fail(400, { error: "Ogiltigt belopp" });

		// If entered including VAT, convert to excluding VAT for storage
		if (inclVat) {
			amount = amount / (1 + vatRate);
		}

		await db.productFinanceEntry.create({
			data: {
				productId: params.id,
				type: type as any,
				description,
				amount,
				vatRate,
				isRecurring,
				category,
				startDate: startDateStr ? new Date(startDateStr) : new Date(),
				endDate: endDateStr ? new Date(endDateStr) : null,
			},
		});

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.finance.create",
			entityId: params.id,
			details: { type, amount, vatRate },
			request,
		});
		return { success: true };
	},

	deleteFinanceEntry: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const id = fd.get("id") as string;
		if (!id) return fail(400, { error: "ID saknas" });
		await db.productFinanceEntry.delete({ where: { id } });

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.finance.delete",
			entityId: params.id,
			request,
		});
		return { success: true };
	},

	// ── Product update ───────────────────────────────────
	updateProduct: async ({ request, params, locals }) => {
		const fd = await request.formData();
		const name = (fd.get("name") as string)?.trim();
		const description = (fd.get("description") as string) || null;
		const status = fd.get("status") as string;
		if (!name) return fail(400, { error: "Namn krävs" });

		await db.product.update({
			where: { id: params.id },
			data: { name, description, status: status as any },
		});

		await createSystemLog(db, {
			userId: locals.user?.id,
			action: "product.update",
			entityId: params.id,
			request,
		});
		return { success: true };
	},
};
