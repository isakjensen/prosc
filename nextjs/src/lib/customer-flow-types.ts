export type FlowItemKind =
  | "custom_note"
  | "meeting"
  | "quote"
  | "bolagsfakta_scrape"
  | "customer_record"
  | "prospect_milestone"
  | "activity"

export interface FlowItemJson {
  kind: FlowItemKind
  sourceId: string
  title: string
  subtitle?: string | null
  description?: string | null
  href?: string | null
  occurredAt: string
  editable: { date: boolean; noteFields: boolean }
}
