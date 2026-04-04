/** Resultat från Google-sök + Ollama (kan serialiseras till API-svar). */

export type CompanyEnrichmentFromOllama = {
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
  ollamaError: string | null
  enrichment: CompanyEnrichmentFromOllama | null
}
