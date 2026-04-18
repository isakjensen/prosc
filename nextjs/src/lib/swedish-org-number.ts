/**
 * Normaliserar svenskt org.nr till ######-#### (10 siffror) eller ######-XXXX (maskerat, t.ex. Bolagsfakta för enskild firma).
 */
export function normalizeOrgNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  let t = raw.trim().replace(/\s/g, "")
  if (!t) return null

  t = t.replace(/−/g, "-")

  const maskedDash = t.match(/^(\d{6})-([X]{4})(?:-\d+)?$/i)
  if (maskedDash) {
    return `${maskedDash[1]}-${maskedDash[2].toUpperCase()}`
  }

  const maskedCompact = t.match(/^(\d{6})([X]{4})$/i)
  if (maskedCompact) {
    return `${maskedCompact[1]}-${maskedCompact[2].toUpperCase()}`
  }

  const hyphDigs = t.match(/^(\d{6})-(\d{4})$/)
  if (hyphDigs) {
    return `${hyphDigs[1]}-${hyphDigs[2]}`
  }

  const digits = t.replace(/\D/g, "")
  if (digits.length === 10) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`
  }

  return null
}

/** Varianter för DB-sökning (äldre rader sparade utan bindestreck). */
export function orgNumberLookupVariants(normalized: string | null | undefined): string[] {
  if (!normalized) return []
  const out = new Set<string>([normalized])
  const m = /^(\d{6})-(\d{4})$/.exec(normalized)
  if (m && /^[0-9]{4}$/.test(m[2])) {
    out.add(`${m[1]}${m[2]}`)
  }
  const mx = /^(\d{6})-(XXXX)$/i.exec(normalized)
  if (mx) {
    out.add(`${mx[1]}${mx[2].toUpperCase()}`)
  }
  return [...out]
}

/**
 * Listskrapning: bolag med maskerat org.nr (XXXX) eller text som inte går att tolka som ######-#### / ######-XXXX ska inte bli kund automatiskt.
 */
export function shouldAutoRedlistByOrgNummer(
  raw: string | null | undefined,
  normalized: string | null,
): boolean {
  const t = raw?.trim() ?? ""
  if (/XXXX/i.test(t)) return true
  if (normalized && /XXXX/i.test(normalized)) return true
  if (t.length > 0 && normalized === null) return true
  return false
}
