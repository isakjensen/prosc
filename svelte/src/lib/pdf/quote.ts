import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSettings } from "$lib/server/settings.js";
import { db } from "$lib/db";
import { getContentArea, addHeaderFooter } from "./layout.js";

type QuoteWithCompanyAndLines = {
	number: string;
	title: string;
	status: string;
	validUntil: Date | null;
	subtotal: number;
	tax: number;
	total: number;
	notes: string | null;
	createdAt: Date;
	company: { name: string; address?: string | null; city?: string | null; zip?: string | null; country?: string | null };
	lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
};

export async function generateQuotePdf(quote: QuoteWithCompanyAndLines): Promise<Uint8Array> {
	const settings = await getSettings(db);
	const doc = await PDFDocument.create();
	const page = doc.addPage([595, 842]);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const { yMax, width, margin } = getContentArea();

	let y = yMax;

	// Header
	page.drawText(settings.companyName || "Offert", {
		x: margin,
		y,
		size: 18,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 28;

	page.drawText(`Offert ${quote.number}`, {
		x: margin,
		y,
		size: 14,
		font: fontBold,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 20;

	page.drawText(`Titel: ${quote.title}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 16;

	const createdStr = new Date(quote.createdAt).toLocaleDateString("sv-SE");
	page.drawText(`Datum: ${createdStr}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.4, 0.4, 0.4),
	});
	y -= 14;

	if (quote.validUntil) {
		page.drawText(`Giltig till: ${new Date(quote.validUntil).toLocaleDateString("sv-SE")}`, {
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
	page.drawText(quote.company.name, {
		x: margin,
		y,
		size: 11,
		font,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 24;

	// Table header
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

	for (const item of quote.lineItems) {
		if (y < 120) {
			const newPage = doc.addPage([595, 842]);
			y = yMax;
			// Could add header on new page - for simplicity we continue
		}
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
	page.drawText(`${quote.subtotal.toFixed(2)} kr`, { x: colTotal, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
	y -= 14;
	page.drawText("Moms:", { x: colTotal - 80, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
	page.drawText(`${quote.tax.toFixed(2)} kr`, { x: colTotal, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
	y -= 18;
	page.drawText("Totalt:", { x: colTotal - 80, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
	page.drawText(`${quote.total.toFixed(2)} kr`, { x: colTotal, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

	if (quote.notes) {
		y -= 24;
		page.drawText("Anteckningar:", { x: margin, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
		y -= 12;
		const noteLines = quote.notes.slice(0, 200).split("\n");
		for (const line of noteLines.slice(0, 4)) {
			page.drawText(line.slice(0, 80), { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
			y -= 12;
		}
	}

	// Footer on first page
	const pages = doc.getPages();
	await addHeaderFooter(doc, settings, 0, pages.length);

	const pdfBytes = await doc.save();
	return pdfBytes;
}
