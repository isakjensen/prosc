import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/db";
import { generateInvoicePdf } from "$lib/pdf/invoice";

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, "Du måste vara inloggad");
	}
	const invoice = await db.invoice.findUnique({
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
	if (!invoice) {
		throw error(404, "Faktura hittades inte");
	}
	const pdfBytes = await generateInvoicePdf(invoice);
	const filename = `faktura-${invoice.number.replace(/\s/g, "-")}.pdf`;
	return new Response(pdfBytes, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": String(pdfBytes.length),
		},
	});
};
