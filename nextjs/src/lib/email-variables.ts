export interface VariableData {
  fornamn?: string
  efternamn?: string
  foretag?: string
  stad?: string
  bransch?: string
  orgnummer?: string
}

export const AVAILABLE_VARIABLES = [
  { key: "fornamn", label: "Förnamn" },
  { key: "efternamn", label: "Efternamn" },
  { key: "foretag", label: "Företag" },
  { key: "stad", label: "Stad" },
  { key: "bransch", label: "Bransch" },
  { key: "orgnummer", label: "Org.nummer" },
] as const

export function resolveVariables(
  template: string,
  data: VariableData,
): string {
  let result = template
  for (const { key } of AVAILABLE_VARIABLES) {
    const value = data[key] ?? ""
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

export function buildVariableData(
  customer: {
    name?: string | null
    city?: string | null
    industry?: string | null
    orgNumber?: string | null
  },
  contact?: {
    firstName?: string | null
    lastName?: string | null
  } | null,
): VariableData {
  return {
    fornamn: contact?.firstName ?? "",
    efternamn: contact?.lastName ?? "",
    foretag: customer.name ?? "",
    stad: customer.city ?? "",
    bransch: customer.industry ?? "",
    orgnummer: customer.orgNumber ?? "",
  }
}
