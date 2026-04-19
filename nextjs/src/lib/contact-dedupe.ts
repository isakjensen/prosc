export type ContactDedupeReason = "multiple_roles" | "duplicate_same_role"

export type ContactDedupeRow = {
  id: string
  customerId: string
  firstName: string
  lastName: string
  title: string | null
  role: string | null
  email: string | null
  createdAt: Date
}

export type ContactDedupePlanEntry = {
  customerId: string
  customerName: string
  firstName: string
  lastName: string
  reason: ContactDedupeReason
  /** Rader som tas bort */
  remove: {
    id: string
    title: string | null
    role: string | null
    email: string | null
  }[]
  /** Vid duplicate_same_role: raden som behålls */
  kept?: {
    id: string
    title: string | null
    role: string | null
    email: string | null
  }
}

function normalizeNamePart(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase()
}

function roleKey(role: string | null) {
  const t = (role ?? "").trim()
  return t === "" ? "__empty__" : t.toLowerCase()
}

function groupKey(customerId: string, firstName: string, lastName: string) {
  return `${customerId}|${normalizeNamePart(firstName)}|${normalizeNamePart(lastName)}`
}

export function buildContactDedupePlan(
  contacts: ContactDedupeRow[],
  customerNameById: Map<string, string>,
): { plan: ContactDedupePlanEntry[]; idsToDelete: string[] } {
  const byPerson = new Map<string, ContactDedupeRow[]>()
  for (const c of contacts) {
    const k = groupKey(c.customerId, c.firstName, c.lastName)
    const arr = byPerson.get(k)
    if (arr) arr.push(c)
    else byPerson.set(k, [c])
  }

  const plan: ContactDedupePlanEntry[] = []
  const idsToDelete: string[] = []

  for (const [, rows] of byPerson) {
    if (rows.length < 2) continue

    const distinctRoles = new Set(rows.map((r) => roleKey(r.role)))
    const customerId = rows[0].customerId
    const customerName = customerNameById.get(customerId) ?? customerId
    const firstName = rows[0].firstName
    const lastName = rows[0].lastName

    const toRow = (r: ContactDedupeRow) => ({
      id: r.id,
      title: r.title,
      role: r.role,
      email: r.email,
    })

    if (distinctRoles.size >= 2) {
      for (const r of rows) idsToDelete.push(r.id)
      plan.push({
        customerId,
        customerName,
        firstName,
        lastName,
        reason: "multiple_roles",
        remove: rows.map(toRow),
      })
      continue
    }

    // Same normalized role for everyone in the group
    const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const kept = sorted[0]
    const remove = sorted.slice(1)
    for (const r of remove) idsToDelete.push(r.id)
    plan.push({
      customerId,
      customerName,
      firstName,
      lastName,
      reason: "duplicate_same_role",
      kept: toRow(kept),
      remove: remove.map(toRow),
    })
  }

  return { plan, idsToDelete }
}
