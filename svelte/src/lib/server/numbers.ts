import type { PrismaClient } from "@prisma/client";
import { getSettings } from "./settings.js";

export async function getNextQuoteNumber(db: PrismaClient): Promise<string> {
	const settings = await getSettings(db);
	const prefix = settings.quoteNumberPrefix || "OFF";
	const year = new Date().getFullYear();
	const fullPrefix = `${prefix}-${year}-`;
	const count = await db.quote.count({
		where: { number: { startsWith: fullPrefix } },
	});
	return `${fullPrefix}${String(count + 1).padStart(3, "0")}`;
}

export async function getNextContractNumber(db: PrismaClient): Promise<string> {
	const settings = await getSettings(db);
	const prefix = settings.contractNumberPrefix || "AVT";
	const year = new Date().getFullYear();
	const fullPrefix = `${prefix}-${year}-`;
	const count = await db.contract.count({
		where: { number: { startsWith: fullPrefix } },
	});
	return `${fullPrefix}${String(count + 1).padStart(3, "0")}`;
}

export async function getNextInvoiceNumber(db: PrismaClient): Promise<string> {
	const settings = await getSettings(db);
	const prefix = settings.invoiceNumberPrefix || "FKT";
	const year = new Date().getFullYear();
	const fullPrefix = `${prefix}-${year}-`;
	const count = await db.invoice.count({
		where: { number: { startsWith: fullPrefix } },
	});
	return `${fullPrefix}${String(count + 1).padStart(3, "0")}`;
}
