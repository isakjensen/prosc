import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/db";
import { generateQuotePdf } from "$lib/pdf/quote.js";

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, "Du måste vara inloggad");
	}
	const quote = await db.quote.findUnique({
		where: { id: params.id },
		include: {
			company: {
				select: {
					name: true,
					address: true,
					city: true,
					zip: true,
					country: true,
				},
			},
			lineItems: true,
		},
	});
	if (!quote) {
		throw error(404, "Offert hittades inte");
	}
	const pdfBytes = await generateQuotePdf(quote);
	const filename = `offert-${quote.number.replace(/\s/g, "-")}.pdf`;
	return new Response(pdfBytes as unknown as BodyInit, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": String(pdfBytes.length),
		},
	});
};
