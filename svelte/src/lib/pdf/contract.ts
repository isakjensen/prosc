import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSettings } from "$lib/server/settings.js";
import { db } from "$lib/db";
import { getContentArea, addHeaderFooter } from "./layout.js";

type ContractWithCompany = {
	number: string;
	title: string;
	content: string;
	status: string;
	signedAt: Date | null;
	expiresAt: Date | null;
	createdAt: Date;
	company: { name: string; address?: string | null };
};

export async function generateContractPdf(contract: ContractWithCompany): Promise<Uint8Array> {
	const settings = await getSettings(db);
	const doc = await PDFDocument.create();
	const page = doc.addPage([595, 842]);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const { yMax, width, margin } = getContentArea();

	let y = yMax;

	page.drawText(settings.companyName || "Avtal", {
		x: margin,
		y,
		size: 18,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 28;

	page.drawText(`Avtal ${contract.number}`, {
		x: margin,
		y,
		size: 14,
		font: fontBold,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 20;

	page.drawText(`Titel: ${contract.title}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.3, 0.3, 0.3),
	});
	y -= 16;

	page.drawText(`Part: ${contract.company.name}`, {
		x: margin,
		y,
		size: 10,
		font,
		color: rgb(0.4, 0.4, 0.4),
	});
	y -= 20;

	const createdStr = new Date(contract.createdAt).toLocaleDateString("sv-SE");
	page.drawText(`Skapad: ${createdStr}`, {
		x: margin,
		y,
		size: 9,
		font,
		color: rgb(0.5, 0.5, 0.5),
	});
	y -= 24;

	const lineHeight = 12;
	const maxCharsPerLine = 85;
	const content = contract.content || "Inget innehåll.";
	let line = "";
	const lines: string[] = [];
	for (const word of content.split(/\s+/)) {
		if ((line + " " + word).trim().length > maxCharsPerLine && line.length > 0) {
			lines.push(line.trim());
			line = word;
		} else {
			line = line ? line + " " + word : word;
		}
	}
	if (line) lines.push(line);

	for (const text of lines) {
		if (y < 100) break;
		page.drawText(text.slice(0, 100), {
			x: margin,
			y,
			size: 10,
			font,
			color: rgb(0.2, 0.2, 0.2),
		});
		y -= lineHeight;
	}

	if (contract.signedAt) {
		y -= 16;
		page.drawText(`Signerad: ${new Date(contract.signedAt).toLocaleDateString("sv-SE")}`, {
			x: margin,
			y,
			size: 9,
			font: fontBold,
			color: rgb(0.2, 0.2, 0.2),
		});
	}

	const pages = doc.getPages();
	for (let i = 0; i < pages.length; i++) {
		await addHeaderFooter(doc, settings, i, pages.length);
	}

	return await doc.save();
}
