import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SystemSettingsMap } from "$lib/server/settings.js";

const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FOOTER_Y = 40;
const HEADER_HEIGHT = 80;

export function getContentArea() {
	return {
		yMax: PAGE_HEIGHT - MARGIN - HEADER_HEIGHT,
		yMin: FOOTER_Y + 20,
		width: CONTENT_WIDTH,
		margin: MARGIN,
	};
}

export async function addHeaderFooter(
	doc: PDFDocument,
	settings: SystemSettingsMap,
	pageIndex: number,
	totalPages: number,
): Promise<void> {
	const pages = doc.getPages();
	const page = pages[pageIndex];
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const companyName = settings.companyName || "Företag";
	const companyAddress = settings.companyAddress || "";

	// Header
	page.drawText(companyName, {
		x: MARGIN,
		y: PAGE_HEIGHT - MARGIN - 14,
		size: 14,
		font: fontBold,
		color: rgb(0.2, 0.2, 0.2),
	});
	if (companyAddress) {
		const lines = companyAddress.split("\n").filter(Boolean);
		let y = PAGE_HEIGHT - MARGIN - 28;
		for (const line of lines.slice(0, 2)) {
			page.drawText(line, {
				x: MARGIN,
				y,
				size: 9,
				font,
				color: rgb(0.4, 0.4, 0.4),
			});
			y -= 12;
		}
	}

	// Footer: page number
	const pageText = `Sida ${pageIndex + 1} av ${totalPages}`;
	const textWidth = font.widthOfTextAtSize(pageText, 9);
	page.drawText(pageText, {
		x: PAGE_WIDTH - MARGIN - textWidth,
		y: FOOTER_Y,
		size: 9,
		font,
		color: rgb(0.5, 0.5, 0.5),
	});
	if (companyAddress) {
		const firstLine = companyAddress.split("\n")[0] || "";
		if (firstLine.length < 50) {
			page.drawText(firstLine, {
				x: MARGIN,
				y: FOOTER_Y,
				size: 8,
				font,
				color: rgb(0.5, 0.5, 0.5),
			});
		}
	}
}

export async function createDocumentWithLayout(
	settings: SystemSettingsMap,
): Promise<PDFDocument> {
	const doc = await PDFDocument.create();
	doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	return doc;
}
