import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

const PAGE_SIZE = 25;
const SORT_FIELDS = ["createdAt", "action", "entityType"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== "ADMIN") {
		throw redirect(302, "/dashboard");
	}

	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
	const search = (url.searchParams.get("search") ?? "").trim();
	const userId = url.searchParams.get("userId") ?? "";
	const actionFilter = url.searchParams.get("action") ?? "";
	const entityTypeFilter = url.searchParams.get("entityType") ?? "";
	const dateFrom = url.searchParams.get("dateFrom") ?? "";
	const dateTo = url.searchParams.get("dateTo") ?? "";
	const sortBy = (url.searchParams.get("sortBy") ?? "createdAt") as SortField;
	const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

	const where: Parameters<typeof db.systemLog.findMany>[0]["where"] = {};

	if (search) {
		where.OR = [
			{ action: { contains: search } },
			{ entityType: { contains: search } },
			{ details: { contains: search } },
		];
	}
	if (userId) {
		where.userId = userId;
	}
	if (actionFilter) {
		where.action = actionFilter;
	}
	if (entityTypeFilter) {
		where.entityType = entityTypeFilter;
	}
	if (dateFrom || dateTo) {
		where.createdAt = {};
		if (dateFrom) {
			where.createdAt.gte = new Date(dateFrom);
		}
		if (dateTo) {
			const end = new Date(dateTo);
			end.setHours(23, 59, 59, 999);
			where.createdAt.lte = end;
		}
	}

	const orderByField = SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";
	const orderBy = { [orderByField]: sortOrder } as const;

	const [logs, totalCount, users, actions, entityTypes] = await Promise.all([
		db.systemLog.findMany({
			where,
			orderBy,
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: {
				user: {
					select: { id: true, name: true, email: true },
				},
			},
		}),
		db.systemLog.count({ where }),
		db.user.findMany({
			select: { id: true, name: true, email: true },
			orderBy: { name: "asc" },
		}),
		db.systemLog.findMany({
			select: { action: true },
			distinct: ["action"],
			orderBy: { action: "asc" },
		}),
		db.systemLog.findMany({
			select: { entityType: true },
			distinct: ["entityType"],
			where: { entityType: { not: null } },
			orderBy: { entityType: "asc" },
		}),
	]);

	const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

	return {
		logs,
		totalCount,
		page,
		pageSize: PAGE_SIZE,
		totalPages,
		users,
		actions: actions.map((a) => a.action).filter(Boolean),
		entityTypes: entityTypes.map((e) => e.entityType).filter(Boolean) as string[],
		filters: {
			search,
			userId,
			action: actionFilter,
			entityType: entityTypeFilter,
			dateFrom,
			dateTo,
			sortBy: orderByField,
			sortOrder,
		},
	};
};
