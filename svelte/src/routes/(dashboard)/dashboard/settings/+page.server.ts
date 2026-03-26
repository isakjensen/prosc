import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { getSettings, setSettings, type SystemSettingsMap } from "$lib/server/settings.js";
import { createSystemLog } from "$lib/utils/systemLog";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { settings: {} as SystemSettingsMap, user: null, isAdmin: false };
	}
	const settings = await getSettings(db);
	return {
		settings,
		user: locals.user,
		isAdmin: locals.user.role === "ADMIN",
	};
};

export const actions: Actions = {
	updateSettings: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		if (locals.user.role !== "ADMIN") {
			return fail(403, { error: "Endast administratörer kan ändra systeminställningar" });
		}
		const data = await request.formData();
		const settings: Record<string, string> = {
			companyName: (data.get("companyName") as string) ?? "",
			companyAddress: (data.get("companyAddress") as string) ?? "",
			companyOrgNr: (data.get("companyOrgNr") as string) ?? "",
			quoteNumberPrefix: (data.get("quoteNumberPrefix") as string) ?? "OFF",
			contractNumberPrefix: (data.get("contractNumberPrefix") as string) ?? "AVT",
			invoiceNumberPrefix: (data.get("invoiceNumberPrefix") as string) ?? "FKT",
			defaultTaxPercent: (data.get("defaultTaxPercent") as string) ?? "25",
			logoUrl: (data.get("logoUrl") as string) ?? "",
		};
		await setSettings(db, settings);
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "settings.updateSettings",
			entityType: "SystemSetting",
			details: { keys: Object.keys(settings) },
			request,
		});
		return { success: true };
	},

	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const name = (data.get("name") as string)?.trim();
		if (!name) {
			return fail(400, { profileError: "Namn krävs" });
		}
		await db.user.update({
			where: { id: locals.user.id },
			data: { name },
		});
		await createSystemLog(db, {
			userId: locals.user.id,
			action: "settings.updateProfile",
			entityType: "User",
			entityId: locals.user.id,
			details: { name },
			request,
		});
		return { profileSuccess: true };
	},
};
