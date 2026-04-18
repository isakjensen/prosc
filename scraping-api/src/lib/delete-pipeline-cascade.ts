import type { PrismaClient } from '@prisma/client'

export type DeletePipelineCascadeResult =
  | { ok: true; deletedCustomerCount: number }
  | { ok: false; code: 'NOT_FOUND' | 'RUNNING' }

/**
 * Tar bort en Bolagsfakta-pipeline och alla dess listrader.
 * Kunder som enbart var kopplade till denna pipeline tas bort tillsammans med relaterad data.
 */
export async function deletePipelineCascade(
  prisma: PrismaClient,
  pipelineId: string,
): Promise<DeletePipelineCascadeResult> {
  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id: pipelineId },
    select: { id: true, status: true },
  })
  if (!pipeline) return { ok: false, code: 'NOT_FOUND' }
  if (pipeline.status === 'RUNNING') return { ok: false, code: 'RUNNING' }

  const foretagRows = await prisma.bolagsfaktaForetag.findMany({
    where: { pipelineId },
    select: { customerId: true },
  })
  const candidateCustomerIds = [
    ...new Set(foretagRows.map((f) => f.customerId).filter(Boolean)),
  ] as string[]

  const customersToDelete: string[] = []
  for (const cid of candidateCustomerIds) {
    const elsewhere = await prisma.bolagsfaktaForetag.count({
      where: { customerId: cid, pipelineId: { not: pipelineId } },
    })
    if (elsewhere === 0) customersToDelete.push(cid)
  }

  await prisma.$transaction(async (tx) => {
    await tx.bolagsfaktaPipeline.delete({ where: { id: pipelineId } })

    if (customersToDelete.length === 0) return

    await tx.activities.deleteMany({
      where: {
        OR: [
          { customerId: { in: customersToDelete } },
          { contacts: { customerId: { in: customersToDelete } } },
          { quotes: { customerId: { in: customersToDelete } } },
          { invoices: { customerId: { in: customersToDelete } } },
          { contracts: { customerId: { in: customersToDelete } } },
          { support_tickets: { customerId: { in: customersToDelete } } },
        ],
      },
    })

    await tx.files.deleteMany({ where: { customerId: { in: customersToDelete } } })
    await tx.outbound_emails.deleteMany({ where: { customerId: { in: customersToDelete } } })
    await tx.tasks.deleteMany({ where: { customerId: { in: customersToDelete } } })
    await tx.campaigns.deleteMany({ where: { customerId: { in: customersToDelete } } })
    await tx.documents.deleteMany({ where: { customerId: { in: customersToDelete } } })
    await tx.meetings.deleteMany({ where: { customerId: { in: customersToDelete } } })

    await tx.customer.deleteMany({ where: { id: { in: customersToDelete } } })
  })

  return { ok: true, deletedCustomerCount: customersToDelete.length }
}
