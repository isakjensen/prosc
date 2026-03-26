import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/db";
import { stageNameSv } from "$lib/i18n/prospectStages";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ params, locals }) => {
	const company = await db.company.findUnique({
		where: { id: params.id },
		include: {
			prospectStage: {
				include: {
					currentStage: true,
				},
			},
			contacts: true,
			projects: true,
			quotes: {
				orderBy: {
					createdAt: "desc",
				},
			},
			contracts: {
				orderBy: {
					createdAt: "desc",
				},
			},
			activities: {
				include: {
					user: {
						select: {
							name: true,
							email: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				take: 20,
			},
		},
	});
	
	if (!company) {
		throw error(404, "Prospekt hittades inte");
	}
	
	const stages = await db.prospectStage.findMany({
		orderBy: {
			order: "asc",
		},
	});
	
	return {
		company,
		stages,
		user: locals.user,
	};
};

export const actions: Actions = {
	updateStage: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Unauthorized" };
		}
		
		const data = await request.formData();
		const stageId = data.get("stageId") as string;
		
		if (!stageId) {
			return { error: "Steg krävs" };
		}
		
		await db.prospectStageHistory.upsert({
			where: { companyId: params.id },
			update: {
				currentStageId: stageId,
				enteredAt: new Date(),
			},
			create: {
				companyId: params.id,
				currentStageId: stageId,
			},
		});
		
		const stage = await db.prospectStage.findUnique({
			where: { id: stageId },
		});
		
		await db.activity.create({
			data: {
				type: "STAGE_CHANGED",
				title: "Steg ändrat",
				description: stage ? `Ändrat till: ${stageNameSv(stage.name)}` : undefined,
				companyId: params.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "prospect.updateStage",
			entityType: "Company",
			entityId: params.id,
			details: { stageId, stageName: stage?.name },
			request,
		});

		return { success: true };
	},
	
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Unauthorized" };
		}
		
		const data = await request.formData();
		const name = data.get("name") as string;
		const email = data.get("email") as string;
		const phone = data.get("phone") as string;
		const industry = data.get("industry") as string;
		const website = data.get("website") as string;
		
		await db.company.update({
			where: { id: params.id },
			data: {
				name,
				email: email || undefined,
				phone: phone || undefined,
				industry: industry || undefined,
				website: website || undefined,
			},
		});
		
		await db.activity.create({
			data: {
				type: "UPDATED",
				title: "Prospekt uppdaterat",
				companyId: params.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "prospect.update",
			entityType: "Company",
			entityId: params.id,
			details: { name },
			request,
		});
		
		return { success: true };
	},
};
