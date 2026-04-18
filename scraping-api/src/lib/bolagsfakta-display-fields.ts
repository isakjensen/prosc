export type BolagsfaktaDisplayFields = {
  firmaNamn: string | null
  bolagsformDetail: string | null
  registreringsStatus: string | null
  gatuadress: string | null
  postadress: string | null
  seatLocation: string | null
  bolagetBildatText: string | null
  bolagetRegistreratText: string | null
  momsregnr: string | null
  omsattningSenaste: string | null
  aretsResultatSenaste: string | null
  ebitdaSenaste: string | null
  utdelningSenaste: string | null
}

function tableLookup(tables: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = tables[k]
    if (v && String(v).trim()) return String(v).trim()
  }
  return null
}

function mergeForetagTables(parsed: {
  omForetaget: Record<string, unknown>
}): Record<string, string> {
  const om = parsed.omForetaget as Record<string, unknown> | undefined
  const alla = (om?.allaTabeller as Record<string, string>) ?? {}
  const fp = (om?.företagsuppgifterTabell as Record<string, string>) ?? {}
  return { ...fp, ...alla }
}

/** Parsar översikt senaste bokslut från översiktssidan (KSEK-block) */
function extractSenasteBokslutFromOverview(overview: Record<string, unknown>): {
  omsattningSenaste: string | null
  aretsResultatSenaste: string | null
  ebitdaSenaste: string | null
  utdelningSenaste: string | null
} {
  const raw = overview.översiktSenasteBokslutText
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      omsattningSenaste: null,
      aretsResultatSenaste: null,
      ebitdaSenaste: null,
      utdelningSenaste: null,
    }
  }
  const ksek = [...raw.matchAll(/([\d\s]{3,})\s*KSEK/gi)].map(m => m[0].replace(/\s+/g, " ").trim())
  return {
    omsattningSenaste: ksek[0] ?? null,
    aretsResultatSenaste: ksek[1] ?? null,
    ebitdaSenaste: ksek[2] ?? null,
    utdelningSenaste: ksek[3] ?? null,
  }
}

export function buildBolagsfaktaDisplayFields(parsed: {
  overview: Record<string, unknown>
  omForetaget: Record<string, unknown>
}): BolagsfaktaDisplayFields {
  const tables = mergeForetagTables(parsed)
  const kpis = extractSenasteBokslutFromOverview(parsed.overview)

  return {
    firmaNamn: tableLookup(tables, ["Firmanamn"]),
    bolagsformDetail: tableLookup(tables, ["Bolagsform"]),
    registreringsStatus: tableLookup(tables, ["Status"]),
    gatuadress: tableLookup(tables, ["Gatuadress"]),
    postadress: tableLookup(tables, ["Postadress"]),
    seatLocation: tableLookup(tables, ["Säte"]),
    bolagetBildatText: tableLookup(tables, ["Bolaget bildat", "Bolaget bildat "]),
    bolagetRegistreratText: tableLookup(tables, ["Bolaget registrerat"]),
    momsregnr: tableLookup(tables, [
      "Momsregistreringsnummer (VAT-nummer)",
      "Momsregistreringsnummer(VAT-nummer)",
      "Momsregistreringsnummer",
    ]),
    omsattningSenaste: kpis.omsattningSenaste,
    aretsResultatSenaste: kpis.aretsResultatSenaste,
    ebitdaSenaste: kpis.ebitdaSenaste,
    utdelningSenaste: kpis.utdelningSenaste,
  }
}
