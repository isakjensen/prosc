import { runCustomerBolagsfaktaRefreshViaApi } from '@/lib/scraping-api-client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const maxDuration = 300

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: customerId } = await params
  return runCustomerBolagsfaktaRefreshViaApi(customerId, {
    timeoutMs: 280_000,
    intervalMs: 1_500,
  })
}
