import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/db";
import { generateContractPdf } from "$lib/pdf/contract.js";

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, "Du måste vara inloggad");
	}
	const contract = await db.contract.findUnique({
		where: { id: params.id },
		include: {
			company: { select: { name: true, address: true } },
		},
	});
	if (!contract) {
		throw error(404, "Avtal hittades inte");
	}
	const pdfBytes = await generateContractPdf(contract);
	const filename = `avtal-${contract.number.replace(/\s/g, "-")}.pdf`;
	return new Response(pdfBytes as unknown as BodyInit, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": String(pdfBytes.length),
		},
	});
};
