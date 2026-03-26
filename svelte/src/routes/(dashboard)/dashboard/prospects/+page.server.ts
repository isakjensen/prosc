import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get("search") || "";
	const stageId = url.searchParams.get("stageId");
	
	const where: any = {
		type: "PROSPECT",
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
			prospectStage: {
				include: {
					currentStage: true,
				},
			},
			contacts: true,
			_count: {
				select: {
					projects: true,
					quotes: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
	
	const stages = await db.prospectStage.findMany({
		orderBy: {
			order: "asc",
		},
	});
	
	return {
		companies,
		stages,
		search,
		stageId,
	};
};
