import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async () => {
	const stages = await db.prospectStage.findMany({
		orderBy: {
			order: "asc",
		},
	});
	
	return { stages };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Unauthorized" });
		}
		
		const data = await request.formData();
		const name = data.get("name") as string;
		const email = data.get("email") as string;
		const phone = data.get("phone") as string;
		const industry = data.get("industry") as string;
		const website = data.get("website") as string;
		const stageId = data.get("stageId") as string;
		
		if (!name) {
			return fail(400, { error: "Företagsnamn krävs" });
		}
		
		const company = await db.company.create({
			data: {
				name,
				email: email || undefined,
				phone: phone || undefined,
				industry: industry || undefined,
				website: website || undefined,
				type: "PROSPECT",
			},
		});
		
		if (stageId) {
			await db.prospectStageHistory.create({
				data: {
					companyId: company.id,
					currentStageId: stageId,
				},
			});
			
			await db.activity.create({
				data: {
					type: "STAGE_CHANGED",
					title: "Prospektsteg satt",
					companyId: company.id,
					userId: locals.user.id,
				},
			});
		}
		
		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Prospekt skapat",
				description: `Skapade prospekt: ${name}`,
				companyId: company.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "prospect.create",
			entityType: "Company",
			entityId: company.id,
			details: { name, stageId: stageId || undefined },
			request,
		});

		throw redirect(303, `/dashboard/prospects/${company.id}`);
	},
};
