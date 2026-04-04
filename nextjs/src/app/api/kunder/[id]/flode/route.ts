import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCustomerFlowItems } from "@/lib/customer-flow"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 })
  }

  const { id: customerId } = await params
  const exists = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  })
  if (!exists) {
    return NextResponse.json({ error: "Kunden hittades inte" }, { status: 404 })
  }

  const items = await getCustomerFlowItems(customerId)
  return NextResponse.json({ items })
}
