import { ExternalLink } from "lucide-react"

/**
 * Jämför antal enligt Bolagsfakta (vid skapande) mot antal scrapeade företag i pipelinen.
 */
export function PipelineForetagCountComparison({
  bolagsfaktaForetagCount,
  scrapedCount,
  bolagsfaktaListUrl,
  compact = false,
  showBolagsfaktaListLink = true,
}: {
  bolagsfaktaForetagCount: number | null
  scrapedCount: number
  /** Publik lista med alla företag i branschen på Bolagsfakta (samma vy som skrapningen). */
  bolagsfaktaListUrl?: string | null
  compact?: boolean
  /** När false visas inte listlänken här (t.ex. om den redan visas i sidhuvudet). */
  showBolagsfaktaListLink?: boolean
}) {
  if (bolagsfaktaForetagCount == null) {
    if (compact) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-600 tabular-nums">
            {scrapedCount.toLocaleString("sv-SE")} scrapeade
          </span>
          {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
            <a
              href={bolagsfaktaListUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 underline hover:text-gray-900"
            >
              Alla företag på Bolagsfakta
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : null}
        </div>
      )
    }
    return (
      <div className="w-full text-gray-700">
        <span className="tabular-nums">{scrapedCount.toLocaleString("sv-SE")} scrapeade</span>
        <span className="text-gray-400 text-xs ml-1 block mt-0.5">
          Ingen Bolagsfakta-siffra sparad (äldre pipeline)
        </span>
        {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
          <p className="mt-2 text-xs">
            <a
              href={bolagsfaktaListUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-gray-900 underline"
            >
              Öppna fullständig företagslista på Bolagsfakta
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          </p>
        ) : null}
      </div>
    )
  }

  const match = bolagsfaktaForetagCount === scrapedCount

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
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
            <span className="text-brand-green ml-1.5 font-medium">Stämmer</span>
          ) : (
            <span className="ml-1.5">Avviker</span>
          )}
        </div>
        {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
          <a
            href={bolagsfaktaListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 underline hover:text-gray-900"
          >
            Alla företag på Bolagsfakta
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={`w-full rounded-lg border px-4 py-3 text-sm sm:px-5 sm:py-4 ${
        match
          ? "border-brand-green/35 bg-brand-green/10 text-gray-800"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6 lg:gap-10">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 tabular-nums sm:gap-x-8 md:shrink-0">
          <div>
            <span className="text-gray-600">Bolagsfakta (vid skapande): </span>
            <span className="font-semibold">{bolagsfaktaForetagCount.toLocaleString("sv-SE")}</span>
          </div>
          <div>
            <span className="text-gray-600">Scrapeade i pipeline: </span>
            <span className="font-semibold">{scrapedCount.toLocaleString("sv-SE")}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2 md:border-l md:border-current/10 md:pl-6 lg:pl-10">
          <p
            className={`text-xs leading-relaxed ${match ? "text-brand-green" : "text-red-800 font-medium"}`}
          >
            {match
              ? "Antalen stämmer överens."
              : "Antalen stämmer inte överens — kör om listskrapning. (Bolagsfakta-siffran kommer från branschlistan; små avvikelser kan bero på uppdateringar på Bolagsfakta.)"}
          </p>
          {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
            <p className="text-xs">
              <a
                href={bolagsfaktaListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full flex-wrap items-center gap-1.5 font-medium text-gray-900 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-700"
              >
                Öppna fullständig företagslista på Bolagsfakta
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
