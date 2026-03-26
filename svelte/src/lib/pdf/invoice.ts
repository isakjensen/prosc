import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSettings } from "$lib/server/settings.js";
import { db } from "$lib/db";
import { getContentArea, addHeaderFooter } from "./layout.js";

type InvoiceWithRelations = {
	number: string;
	title: string;
	status: string;
	issueDate: Date;
	dueDate: Date | null;
	subtotal: number;
	tax: number;
	total: number;
	paidAmount: number;
	notes: string | null;
	company: { name: string; address?: string | null; city?: string | null; zip?: string | null; country?: string | null };
	lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
};

export async function generateInvoicePdf(invoice: InvoiceWithRelations): Promise<Uint8Array> {
	const settings = await getSettings(db);
	const doc = await PDFDocument.create();
	const page = doc.addPage([595, 842]);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const { yMax, width, margin } = getContentArea();

	let y = yMax;

	page.drawText(settings.companyName || "Faktura", {
		x: margin,
		y,
		size: 18,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 28;

	page.drawText(`Faktura ${invoice.number}`, {
		x: margin,
		y,
		size: 14,
		font: fontBold,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 20;

	page.drawText(`Titel: ${invoice.title}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 16;

	const issueStr = new Date(invoice.issueDate).toLocaleDateString("sv-SE");
	page.drawText(`Fakturadatum: ${issueStr}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.4, 0.4, 0.4),
	});
	y -= 14;

	if (invoice.dueDate) {
		page.drawText(`Förfallodatum: ${new Date(invoice.dueDate).toLocaleDateString("sv-SE")}`, {
			x: margin,
			y,
			size: 10,
			font,
			color: rgb(0.4, 0.4, 0.4),
		});
		y -= 14;
	}

	y -= 10;
	page.drawText("Kund:", {
		x: margin,
		y,
		size: 10,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 14;
	page.drawText(invoice.company.name, {
		x: margin,
		y,
		size: 11,
		font,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 24;

	const colDesc = margin;
	const colQty = margin + width * 0.5;
	const colPrice = margin + width * 0.68;
	const colTotal = margin + width * 0.88;
	page.drawRectangle({
		x: margin,
		y: y - 18,
		width,
		height: 22,
		color: rgb(0.92, 0.92, 0.92),
	});
	page.drawText("Beskrivning", { x: colDesc, y: y - 14, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
	page.drawText("Antal", { x: colQty, y: y - 14, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
	page.drawText("Pris", { x: colPrice, y: y - 14, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
	page.drawText("Summa", { x: colTotal, y: y - 14, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
	y -= 28;

	for (const item of invoice.lineItems) {
		page.drawText(item.description.slice(0, 45), { x: colDesc, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
		page.drawText(String(item.quantity), { x: colQty, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
		page.drawText(`${item.unitPrice.toFixed(2)} kr`, { x: colPrice, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
		page.drawText(`${item.total.toFixed(2)} kr`, { x: colTotal, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
		y -= 18;
	}

	y -= 14;
	page.drawLine({
		start: { x: margin, y },
		end: { x: margin + width, y },
		thickness: 0.5,
		color: rgb(0.7, 0.7, 0.7),
	});
	y -= 18;
	page.drawText("Delsumma:", { x: colTotal - 80, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
	page.drawText(`${invoice.subtotal.toFixed(2)} kr`, { x: colTotal, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
	y -= 14;
	page.drawText("Moms:", { x: colTotal - 80, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
	page.drawText(`${invoice.tax.toFixed(2)} kr`, { x: colTotal, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
	y -= 18;
	page.drawText("Totalt:", { x: colTotal - 80, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
	page.drawText(`${invoice.total.toFixed(2)} kr`, { x: colTotal, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
	y -= 14;
	page.drawText("Betalt:", { x: colTotal - 80, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
	page.drawText(`${invoice.paidAmount.toFixed(2)} kr`, { x: colTotal, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

	const pages = doc.getPages();
	await addHeaderFooter(doc, settings, 0, pages.length);

	return await doc.save();
}
