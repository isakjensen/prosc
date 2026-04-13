import type { CustomerFlowOverrideSourceType } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { FlowItemJson, FlowItemKind } from "@/lib/customer-flow-types"

export type { FlowItemJson, FlowItemKind } from "@/lib/customer-flow-types"

const activityTitle: Record<string, string> = {
  CREATED: "Post skapades",
  UPDATED: "Uppdaterades",
  STAGE_CHANGED: "Status ändrades",
  EMAIL_SENT: "E-post skickades",
  CALL_MADE: "Samtal",
  MEETING_SCHEDULED: "Möte bokades",
  FILE_UPLOADED: "Fil uppladdad",
  CONTRACT_SIGNED: "Avtal signerades",
  QUOTE_SENT: "Offert skickades",
  INVOICE_SENT: "Faktura skickades",
  PAYMENT_RECEIVED: "Betalning mottagen",
  TASK_COMPLETED: "Uppgift slutförd",
  MILESTONE_REACHED: "Milstolpe",
  NOTE_ADDED: "Notering",
}

const quoteStatusSv: Record<string, string> = {
  DRAFT: "Utkast",
  SENT: "Skickad",
  ACCEPTED: "Accepterad",
  REJECTED: "Avvisad",
  EXPIRED: "Utgången",
}

function overrideKey(t: CustomerFlowOverrideSourceType, sourceId: string) {
  return `${t}:${sourceId}`
}

function pickOccurred(
  overrides: Map<string, Date>,
  type: CustomerFlowOverrideSourceType,
  sourceId: string,
  fallback: Date,
): Date {
  return overrides.get(overrideKey(type, sourceId)) ?? fallback
}

export async function getCustomerFlowItems(customerId: string): Promise<FlowItemJson[]> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      bolagsfaktaData: true,
      quotes: { orderBy: { createdAt: "desc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: true },
      },
      flowNotes: { orderBy: { occurredAt: "desc" }, include: { user: true } },
      flowOccurredAtOverrides: true,
    },
  })

  if (!customer) return []

  const overrides = new Map<string, Date>()
  for (const o of customer.flowOccurredAtOverrides) {
    overrides.set(overrideKey(o.sourceType, o.sourceId), o.occurredAt)
  }

  const items: FlowItemJson[] = []

  for (const note of customer.flowNotes) {
    items.push({
      kind: "custom_note",
      sourceId: note.id,
      title: note.title,
      subtitle: note.user?.name ?? null,
      description: note.description,
      href: null,
      occurredAt: note.occurredAt.toISOString(),
      editable: { date: true, noteFields: true },
    })
  }

  for (const q of customer.quotes) {
    const at = pickOccurred(overrides, "QUOTE", q.id, q.createdAt)
    items.push({
      kind: "quote",
      sourceId: q.id,
      title: "Offert",
      subtitle: `${q.number} · ${quoteStatusSv[q.status] ?? q.status}`,
      description: q.title,
      href: `/quotes/${q.id}`,
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  const meetings = await prisma.meeting.findMany({
    where: {
      attendees: {
        some: {
          contact: { customerId },
        },
      },
    },
    orderBy: { startTime: "desc" },
  })

  for (const m of meetings) {
    const at = pickOccurred(overrides, "MEETING", m.id, m.startTime)
    items.push({
      kind: "meeting",
      sourceId: m.id,
      title: "Möte",
      subtitle: m.title,
      description: m.description,
      href: "/meetings",
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  if (customer.bolagsfaktaData) {
    const bf = customer.bolagsfaktaData
    const fallback = bf.scrapedAt ?? bf.updatedAt
    const at = pickOccurred(overrides, "BOLAGSFAKTA_SCRAPE", bf.id, fallback)
    items.push({
      kind: "bolagsfakta_scrape",
      sourceId: bf.id,
      title: "Bolagsfakta hämtad",
      subtitle: null,
      description: bf.sourceUrl,
      href: null,
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  {
    const at = pickOccurred(overrides, "CUSTOMER_RECORD", customer.id, customer.createdAt)
    items.push({
      kind: "customer_record",
      sourceId: customer.id,
      title: "Kundpost skapad",
      subtitle: null,
      description: null,
      href: null,
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  const showProspectMilestone =
    customer.stage !== "SCRAPED" ||
    customer.promotedToProspectAt != null

  if (showProspectMilestone) {
    const fallback =
      customer.promotedToProspectAt ??
      customer.createdAt
    const at = pickOccurred(overrides, "PROSPECT_MILESTONE", customer.id, fallback)
    items.push({
      kind: "prospect_milestone",
      sourceId: customer.id,
      title:
        customer.promotedToProspectAt != null
          ? "Lyft till prospekt"
          : "Prospekt / kundpost",
      subtitle: null,
      description: null,
      href: null,
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  for (const a of customer.activities) {
    const at = pickOccurred(overrides, "ACTIVITY", a.id, a.createdAt)
    const base = activityTitle[a.type] ?? a.type
    items.push({
      kind: "activity",
      sourceId: a.id,
      title: base,
      subtitle: a.user?.name ?? "System",
      description: a.description ?? a.title,
      href: null,
      occurredAt: at.toISOString(),
      editable: { date: true, noteFields: false },
    })
  }

  items.sort(
    (x, y) => new Date(y.occurredAt).getTime() - new Date(x.occurredAt).getTime(),
  )

  return items
}

export function flowKindToOverrideType(kind: FlowItemKind): CustomerFlowOverrideSourceType | null {
  switch (kind) {
    case "meeting":
      return "MEETING"
    case "quote":
      return "QUOTE"
    case "bolagsfakta_scrape":
      return "BOLAGSFAKTA_SCRAPE"
    case "customer_record":
      return "CUSTOMER_RECORD"
    case "prospect_milestone":
      return "PROSPECT_MILESTONE"
    case "activity":
      return "ACTIVITY"
    default:
      return null
  }
}
