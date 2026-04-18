/** Publik sida med alla företag i vald bransch + kommun (samma URL som listskrapningen utgår från). */
export function bolagsfaktaBranschListingUrl(parts: {
  kommunSlug: string
  branschSlug: string
  branschKod: string
}): string {
  const { kommunSlug, branschSlug, branschKod } = parts
  return `https://www.bolagsfakta.se/bransch/${encodeURIComponent(kommunSlug)}/${encodeURIComponent(branschSlug)}/${encodeURIComponent(branschKod)}`
}
