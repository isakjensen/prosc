import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";

export const load: PageServerLoad = async () => {
	const contracts = await db.contract.findMany({
		include: {
			company: { select: { id: true, name: true } },
			template: { select: { id: true, name: true } },
			quote: { select: { id: true, number: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	return { contracts };
};
