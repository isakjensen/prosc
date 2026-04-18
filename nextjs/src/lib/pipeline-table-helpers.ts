import { prisma } from "@/lib/db"

/**
 * Antal företagsrader per pipeline med lyckad BF-detaljskrapning (för pipelines-listan).
 */
export async function getPipelineDetailSuccessByPipelineId(
  pipelineIds: string[],
): Promise<Map<string, number>> {
  if (pipelineIds.length === 0) {
    return new Map()
  }

  const detailGroups = await prisma.bolagsfaktaForetag.groupBy({
    by: ["pipelineId", "detailStatus"],
    where: { pipelineId: { in: pipelineIds } },
    _count: { _all: true },
  })

  const detailSuccessByPipelineId = new Map<string, number>()
  for (const g of detailGroups) {
    if (g.detailStatus === "SUCCESS") {
      detailSuccessByPipelineId.set(g.pipelineId, g._count._all)
    }
  }

  return detailSuccessByPipelineId
}
