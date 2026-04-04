/**
 * Jämför antal enligt Bolagsfakta (vid skapande) mot antal scrapeade företag i pipelinen.
 */
export function PipelineForetagCountComparison({
  bolagsfaktaForetagCount,
  scrapedCount,
  compact = false,
}: {
  bolagsfaktaForetagCount: number | null
  scrapedCount: number
  compact?: boolean
}) {
  if (bolagsfaktaForetagCount == null) {
    if (compact) {
      return (
        <span className="text-gray-600 tabular-nums">
          {scrapedCount.toLocaleString('sv-SE')} scrapeade
        </span>
      )
    }
    return (
      <span className="text-gray-700">
        {scrapedCount.toLocaleString('sv-SE')} scrapeade
        <span className="text-gray-400 text-xs ml-1 block mt-0.5">Ingen Bolagsfakta-siffra sparad (äldre pipeline)</span>
      </span>
    )
  }

  const match = bolagsfaktaForetagCount === scrapedCount

  if (compact) {
    return (
      <div
        className={
          match
            ? 'text-gray-700 tabular-nums'
            : 'text-red-600 font-medium tabular-nums'
        }
      >
        <span className="text-gray-500 font-normal">Bolagsfakta: </span>
        {bolagsfaktaForetagCount.toLocaleString('sv-SE')}
        <span className="text-gray-300 mx-1.5">·</span>
        <span className="text-gray-500 font-normal">Scrapeade: </span>
        {scrapedCount.toLocaleString('sv-SE')}
        {match ? (
          <span className="text-emerald-600 ml-1.5 font-medium">Stämmer</span>
        ) : (
          <span className="ml-1.5">Avviker</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        match
          ? 'border-emerald-200 bg-emerald-50/80 text-gray-800'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      <div className="tabular-nums">
        <span className="text-gray-600">Bolagsfakta (vid skapande): </span>
        <span className="font-semibold">{bolagsfaktaForetagCount.toLocaleString('sv-SE')}</span>
      </div>
      <div className="tabular-nums mt-1">
        <span className="text-gray-600">Scrapeade i pipeline: </span>
        <span className="font-semibold">{scrapedCount.toLocaleString('sv-SE')}</span>
      </div>
      <p className={`mt-2 text-xs ${match ? 'text-emerald-800' : 'text-red-800 font-medium'}`}>
        {match
          ? 'Antalen stämmer överens.'
          : 'Antalen stämmer inte överens — kontrollera listan eller kör om skrapning.'}
      </p>
    </div>
  )
}
