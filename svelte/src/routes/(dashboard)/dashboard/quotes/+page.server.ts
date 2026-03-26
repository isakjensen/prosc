import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async () => {
	const quotes = await db.quote.findMany({
		include: {
			company: {
				select: {
					id: true,
					name: true,
				},
			},
			lineItems: true,
			_count: {
				select: {
					contracts: true,
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
		quotes,
		companies,
	};
};
