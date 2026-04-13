/**
 * Safe parsing and routing helpers for SystemLog rows shown in activity UIs.
 */

const ENTITY_LABEL_SV: Record<string, string> = {
  customer: "Kund",
  contact: "Kontakt",
  task: "Uppgift",
  project: "Projekt",
  quote: "Offert",
  invoice: "Faktura",
  contract: "Avtal",
  supportTicket: "Ärende",
  user: "Användare",
  pipeline: "Pipeline",
  meeting: "Möte",
  prospect: "Prospekt",
  bolagsfaktaForetag: "Bolagsfakta-företag",
  teamMember: "Teammedlem",
  document: "Dokument",
  report: "Rapport",
  campaign: "Kampanj",
  knowledgeArticle: "Kunskapsartikel",
}

function normalizeModelKey(entityType: string): string {
  return entityType.charAt(0).toLowerCase() + entityType.slice(1)
}

/** Resolve href for a logged entity when we have a stable detail page. */
export function systemLogEntityHref(
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null
  const key = normalizeModelKey(entityType)

  const routes: Record<string, (id: string) => string> = {
    customer: (id) => `/customers/${id}`,
    contact: (id) => `/contacts/${id}`,
    task: () => `/tasks`,
    project: (id) => `/projects/${id}`,
    quote: (id) => `/quotes/${id}`,
    invoice: (id) => `/invoices/${id}`,
    contract: (id) => `/contracts/${id}`,
    supportTicket: (id) => `/support/${id}`,
    user: (id) => `/users/${id}`,
    pipeline: (id) => `/pipelines/${id}`,
    meeting: () => `/meetings`,
    prospect: () => `/prospects`,
  }

  const fn = routes[key]
  return fn ? fn(entityId) : null
}

export function systemLogEntityLabel(
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (!entityType) return null
  const key = normalizeModelKey(entityType)
  const label = ENTITY_LABEL_SV[key] ?? entityType
  if (entityId) {
    return `${label} · ${entityId.slice(0, 8)}…`
  }
  return label
}

export function parseSystemLogMessage(details: string | null): string | null {
  if (!details) return null
  try {
    const o = JSON.parse(details) as Record<string, unknown>
    const m = o.message
    return typeof m === "string" ? m : null
  } catch {
    return null
  }
}
