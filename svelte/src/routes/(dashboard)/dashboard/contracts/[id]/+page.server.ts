import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { createSystemLog } from "$lib/utils/systemLog";

const STATUS_LABELS: Record<string, string> = {
	DRAFT: "Utkast",
	SENT: "Skickad",
	SIGNED: "Signerad",
	EXPIRED: "Utgången",
	CANCELLED: "Avbruten",
};

export const load: PageServerLoad = async ({ params }) => {
	const contract = await db.contract.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { id: true, name: true, address: true } },
			template: { select: { id: true, name: true } },
			quote: { select: { id: true, number: true } },
		},
	});
	if (!contract) {
		throw error(404, "Avtal hittades inte");
	}
	return { contract, statusLabels: STATUS_LABELS };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return { error: "Du måste vara inloggad" };
		}
		const data = await request.formData();
		const title = (data.get("title") as string)?.trim();
		const status = data.get("status") as string;
		const content = (data.get("content") as string) ?? "";
		const expiresAtRaw = (data.get("expiresAt") as string) || undefined;
		const signedAtRaw = (data.get("signedAt") as string) || undefined;

		if (!title) {
			return { error: "Titel krävs" };
		}

		const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
		const signedAt = signedAtRaw ? new Date(signedAtRaw) : undefined;

		await db.contract.update({
			where: { id: params.id },
			data: {
				title,
				status: (status || undefined) as import("@prisma/client").ContractStatus | undefined,
				content,
				expiresAt,
				...(signedAt !== undefined && { signedAt }),
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "contract.update",
			entityType: "Contract",
			entityId: params.id,
			details: { title, status },
			request,
		});
		return { success: true };
	},
};
