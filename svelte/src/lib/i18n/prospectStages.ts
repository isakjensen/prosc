/**
 * Översättning av prospektsteg från databasen (engelska) till svenska för UI.
 * Stegen sätts i prisma/seed.ts – här mappas endast visningsnamn.
 */
const STAGE_LABELS_SV: Record<string, string> = {
	"Found / Lead": "Hittad / lead",
	Qualified: "Kvalificerad",
	Proposal: "Offert",
	Negotiation: "Förhandling",
	Won: "Vunnen",
	Implementation: "Implementering",
	"Implemented Customer": "Implementerad kund",
};

export function stageNameSv(name: string): string {
	return STAGE_LABELS_SV[name] ?? name;
}
