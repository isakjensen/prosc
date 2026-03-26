import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get("search") || "";
	const companyId = url.searchParams.get("companyId");
	
	const where: any = {};
	
	if (search) {
		where.OR = [
			{ firstName: { contains: search } },
			{ lastName: { contains: search } },
			{ email: { contains: search } },
		];
	}
	
	if (companyId) {
		where.companyId = companyId;
	}
	
	const contacts = await db.contact.findMany({
		where,
		include: {
			company: {
				select: {
					id: true,
					name: true,
					type: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
	
	const companies = await db.company.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	});
	
	return {
		contacts,
		companies,
		search,
		companyId,
	};
};
