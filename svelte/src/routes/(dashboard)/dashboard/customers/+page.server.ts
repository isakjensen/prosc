import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get("search") || "";
	
	const where: any = {
		type: "CUSTOMER",
	};
	
	if (search) {
		where.OR = [
			{ name: { contains: search } },
			{ email: { contains: search } },
		];
	}
	
	const companies = await db.company.findMany({
		where,
		include: {
			contacts: true,
			projects: {
				include: {
					_count: {
						select: {
							tasks: true,
							invoices: true,
						},
					},
				},
			},
			_count: {
				select: {
					projects: true,
					invoices: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
	
	return {
		companies,
		search,
	};
};
