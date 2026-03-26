import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { getNextContractNumber } from "$lib/server/numbers.js";
import { createSystemLog } from "$lib/utils/systemLog";

function replaceTemplateVariables(
	content: string,
	ctx: { companyName: string; contractNumber: string; contractTitle: string; date: string },
): string {
	return content
		.replace(/\{\{company_name\}\}/gi, ctx.companyName)
		.replace(/\{\{contract_number\}\}/gi, ctx.contractNumber)
		.replace(/\{\{contract_title\}\}/gi, ctx.contractTitle)
		.replace(/\{\{date\}\}/gi, ctx.date);
}

export const load: PageServerLoad = async () => {
	const companies = await db.company.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
	const quotes = await db.quote.findMany({
		where: { status: "ACCEPTED" },
		include: { company: { select: { id: true, name: true } } },
		orderBy: { createdAt: "desc" },
	});
	const templates = await db.contractTemplate.findMany({
		select: { id: true, name: true, content: true },
		orderBy: { name: "asc" },
	});
	return { companies, quotes, templates };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: "Du måste vara inloggad" });
		}
		const data = await request.formData();
		const companyId = data.get("companyId") as string;
		const title = (data.get("title") as string)?.trim();
		const templateId = (data.get("templateId") as string) || undefined;
		const quoteId = (data.get("quoteId") as string) || undefined;
		const expiresAtRaw = (data.get("expiresAt") as string) || undefined;

		if (!companyId || !title) {
			return fail(400, { error: "Företag och titel krävs" });
		}

		const company = await db.company.findUnique({ where: { id: companyId }, select: { name: true } });
		if (!company) {
			return fail(400, { error: "Företag hittades inte" });
		}

		const number = await getNextContractNumber(db);
		const dateStr = new Date().toLocaleDateString("sv-SE");

		let content = "";
		if (templateId) {
			const template = await db.contractTemplate.findUnique({ where: { id: templateId } });
			if (template) {
				content = replaceTemplateVariables(template.content, {
					companyName: company.name,
					contractNumber: number,
					contractTitle: title,
					date: dateStr,
				});
			}
		}
		if (!content) {
			content = `Avtal mellan ${company.name} och [Företag].\n\n${title}\n\nDatum: ${dateStr}\n\n[Lägg till avtalsinnehåll här.]`;
		}

		const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : undefined;

		const contract = await db.contract.create({
			data: {
				companyId,
				templateId: templateId || null,
				quoteId: quoteId || null,
				number,
				title,
				content,
				status: "DRAFT",
				expiresAt,
			},
		});

		await db.activity.create({
			data: {
				type: "CREATED",
				title: "Avtal skapad",
				description: `Avtal ${contract.number}: ${contract.title}`,
				companyId: contract.companyId,
				contractId: contract.id,
				userId: locals.user.id,
			},
		});

		await createSystemLog(db, {
			userId: locals.user.id,
			action: "contract.create",
			entityType: "Contract",
			entityId: contract.id,
			details: { number: contract.number, title: contract.title, companyId: contract.companyId },
			request,
		});

		throw redirect(303, `/dashboard/contracts/${contract.id}`);
	},
};
