import { ExternalLink } from "lucide-react"

/**
 * Visar antal företag i branschlistan vs. antal som passerade filtret.
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
  bolagsfaktaListUrl?: string | null
  compact?: boolean
  showBolagsfaktaListLink?: boolean
}) {
  if (scrapedCount === 0) return null

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-700 dark:text-zinc-300 tabular-nums">
          {bolagsfaktaForetagCount != null && (
            <>
              <span className="text-gray-500 dark:text-zinc-400 font-normal">I listan: </span>
              <span className="font-medium">{bolagsfaktaForetagCount.toLocaleString("sv-SE")}</span>
              <span className="text-gray-300 dark:text-zinc-600 mx-1.5">·</span>
            </>
          )}
          <span className="text-gray-500 dark:text-zinc-400 font-normal">Passerade filter: </span>
          <span className="font-medium">{scrapedCount.toLocaleString("sv-SE")}</span>
        </div>
        {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
          <a
            href={bolagsfaktaListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-zinc-400 underline hover:text-gray-900 dark:hover:text-zinc-200"
          >
            Alla företag på Bolagsfakta
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm sm:px-5 sm:py-4 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 tabular-nums sm:gap-x-8">
        {bolagsfaktaForetagCount != null && (
          <div>
            <span className="text-gray-500 dark:text-zinc-400">Företag i branschlistan: </span>
            <span className="font-semibold text-gray-900 dark:text-zinc-100">{bolagsfaktaForetagCount.toLocaleString("sv-SE")}</span>
          </div>
        )}
        <div>
          <span className="text-gray-500 dark:text-zinc-400">Passerade filter: </span>
          <span className="font-semibold text-gray-900 dark:text-zinc-100">{scrapedCount.toLocaleString("sv-SE")}</span>
        </div>
        {showBolagsfaktaListLink && bolagsfaktaListUrl ? (
          <a
            href={bolagsfaktaListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-zinc-400 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-700 dark:hover:text-zinc-200"
          >
            Öppna på Bolagsfakta
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  )
}
