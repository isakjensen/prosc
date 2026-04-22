/** Publik sida med alla företag i vald bransch + kommun (samma URL som listskrapningen utgår från). Returnerar null för manuella pipelines. */
export function bolagsfaktaBranschListingUrl(parts: {
  kommunSlug: string | null | undefined
  branschSlug: string | null | undefined
  branschKod: string | null | undefined
}): string | null {
  const { kommunSlug, branschSlug, branschKod } = parts
  if (!kommunSlug || !branschSlug || !branschKod) return null
  return `https://www.bolagsfakta.se/bransch/${encodeURIComponent(kommunSlug)}/${encodeURIComponent(branschSlug)}/${encodeURIComponent(branschKod)}`
}
