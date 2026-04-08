/** Resultat from Google search + AI analysis (can be serialized to API response). */

export type CompanyEnrichmentFromAI = {
  website: string
  email: string
  phone: string
  confidence: string
  notes: string
}

export type WebsiteDiscoveryResult = {
  skipped: boolean
  skipReason?: string
  googleError: string | null
  aiError: string | null
  enrichment: CompanyEnrichmentFromAI | null
}
