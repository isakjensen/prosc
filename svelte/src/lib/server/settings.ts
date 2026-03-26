import type { PrismaClient } from "@prisma/client";

const DEFAULT_KEYS = [
	"companyName",
	"companyAddress",
	"companyOrgNr",
	"quoteNumberPrefix",
	"contractNumberPrefix",
	"invoiceNumberPrefix",
	"defaultTaxPercent",
	"logoUrl",
] as const;

const DEFAULTS: Record<(typeof DEFAULT_KEYS)[number], string> = {
	companyName: "",
	companyAddress: "",
	companyOrgNr: "",
	quoteNumberPrefix: "OFF",
	contractNumberPrefix: "AVT",
	invoiceNumberPrefix: "FKT",
	defaultTaxPercent: "25",
	logoUrl: "",
};

export type SystemSettingsMap = Record<string, string>;

export async function getSettings(db: PrismaClient): Promise<SystemSettingsMap> {
	const map: SystemSettingsMap = { ...DEFAULTS };
	try {
		const rows = await db.systemSetting.findMany();
		for (const row of rows) {
			map[row.key] = row.value;
		}
	} catch {
		// Table may not exist yet (migration not run)
	}
	return map;
}

export async function setSetting(
	db: PrismaClient,
	key: string,
	value: string,
): Promise<void> {
	await db.systemSetting.upsert({
		where: { key },
		create: { key, value },
		update: { value },
	});
}

export async function setSettings(
	db: PrismaClient,
	settings: SystemSettingsMap,
): Promise<void> {
	for (const key of Object.keys(settings)) {
		await setSetting(db, key, settings[key]);
	}
}
