import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAndCacheBranscher } from '@/lib/bolagsfakta-scraper'
import { KOMMUNER } from '@/lib/kommuner'

function sortByBranschKodNumerisk<T extends { branschKod: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const na = parseInt(a.branschKod.replace(/\D/g, ''), 10) || 0
    const nb = parseInt(b.branschKod.replace(/\D/g, ''), 10) || 0
    return na - nb
  })
}

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const kommunSlug = decodeURIComponent(slug)
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1'

  const kommun = KOMMUNER.find(k => k.slug === kommunSlug)
  if (!kommun) {
    return NextResponse.json({ error: 'Kommunen hittades inte' }, { status: 404 })
  }

  // Kolla cache – hämta på nytt om äldre än 7 dagar
  const cached = await prisma.bolagsfaktaBransch.findMany({
    where: { kommunSlug },
    orderBy: { branschKod: 'asc' },
  })

  const cacheAge = cached[0]?.cachedAt
  const isStale = !cacheAge || Date.now() - cacheAge.getTime() > 7 * 24 * 60 * 60 * 1000
  const missingForetagCount = cached.some((b) => b.foretagCount == null)

  if (cached.length > 0 && !isStale && !missingForetagCount && !forceRefresh) {
    return NextResponse.json(sortByBranschKodNumerisk(cached))
  }

  // Hämta från bolagsfakta och casha
  try {
    await fetchAndCacheBranscher(kommunSlug, kommun.namn)
    const fresh = await prisma.bolagsfaktaBransch.findMany({
      where: { kommunSlug },
      orderBy: { branschKod: 'asc' },
    })
    return NextResponse.json(sortByBranschKodNumerisk(fresh))
  } catch (err) {
    console.error('[branscher] Fel vid hämtning:', err)
    // Returnera gammal cache om vi har den
    if (cached.length > 0) return NextResponse.json(sortByBranschKodNumerisk(cached))
    return NextResponse.json({ error: 'Kunde inte hämta branscher' }, { status: 500 })
  }
}
