/** Visningsformat ######-#### om 10 siffror, annars oförändrat. */
export function formatSwedishOrgNumber(s: string | null | undefined): string | null {
  if (!s) return null
  const d = s.replace(/\D/g, "")
  if (d.length !== 10) return s.trim()
  return `${d.slice(0, 6)}-${d.slice(6)}`
}

function formatPostnummer(digits: string): string {
  const d = digits.replace(/\D/g, "")
  if (d.length !== 5) return digits.trim()
  return `${d.slice(0, 3)} ${d.slice(3)}`
}

/**
 * Stad, postnummer och land utifrån postadress + säte.
 */
export function locationFromPostadressAndSeat(
  postadress: string | null | undefined,
  seatLocation: string | null | undefined,
): { city: string | null; zip: string | null; country: string | null } {
  const post = postadress?.trim() ?? ""
  const seat = seatLocation?.trim() ?? null

  let city: string | null = null
  let zip: string | null = null

  const lines = post.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    const m = line.match(/^(\d{3}\s?\d{2})\s+(.+)$/)
    if (m) {
      zip = formatPostnummer(m[1].replace(/\s/g, ""))
      city = m[2].trim()
      break
    }
  }

  if (!city && seat) {
    city = seat
  }

  let country: string | null = null
  if (/\bsverige\b/i.test(post) || /^sverige$/i.test(post)) {
    country = "Sverige"
  } else if (post || seat) {
    country = "Sverige"
  }

  return { city, zip, country }
}
