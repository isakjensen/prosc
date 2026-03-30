import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get("search") || "";

	const products = await db.product.findMany({
		where: search
			? { name: { contains: search } }
			: undefined,
		include: {
			customers: {
				include: { company: { select: { id: true, name: true } } },
			},
			_count: {
				select: {
					features: true,
					boardColumns: true,
					financeEntries: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return { products, search };
};
