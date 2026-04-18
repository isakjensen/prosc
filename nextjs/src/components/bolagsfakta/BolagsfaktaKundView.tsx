import Link from "next/link"
import type { BolagsfaktaData, Contact } from "@prisma/client"
import { Info } from "lucide-react"
import KundOversiktPanels from "@/app/(dashboard)/customers/[id]/KundOversiktPanels"
import { cn, formatBolagsfaktaKsekSnippetAsSek, formatDate } from "@/lib/utils"
import BolagsfaktaRefreshButton, { type BolagsfaktaSummaryStat } from "./BolagsfaktaRefreshButton"

export type BolagsfaktaCrmMerge = {
  customerName: string
  customerEmail: string | null
  overviewOrgNr: string | null | undefined
  overviewWebsite: string
  overviewWebsiteHref?: string
  overviewPhone: string | null | undefined
  overviewAddress: string | null | undefined
  overviewCity: string | null | undefined
  overviewZip: string | null | undefined
  overviewCountry: string | null | undefined
  createdAt: Date
}

export type BolagsfaktaKundViewProps = {
  customerId: string
  data: BolagsfaktaData
  contacts: Pick<Contact, "id" | "firstName" | "lastName" | "role" | "title" | "email" | "phone">[]
  crmMerge: BolagsfaktaCrmMerge
  summaryStats: BolagsfaktaSummaryStat[]
  notes: string | null
}

function formatOrgNr(s: string | null | undefined): string | null {
  if (!s) return null
  const d = s.replace(/\D/g, "")
  if (d.length !== 10) return s
  return `${d.slice(0, 6)}-${d.slice(6)}`
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-baseline min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0 sm:w-44">{label}</dt>
      <dd className="text-sm text-gray-900 min-w-0 break-words">{value}</dd>
    </div>
  )
}

/** Visar värde även när tomt (t.ex. hemsida). */
function FieldOptional({
  label,
  value,
  emptyLabel,
  href,
}: {
  label: string
  value: string | null | undefined
  emptyLabel?: string
  href?: string
}) {
  const showEmpty = !value?.trim() && emptyLabel
  if (!value?.trim() && !showEmpty) return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-baseline min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0 sm:w-44">{label}</dt>
      <dd className="text-sm min-w-0 break-words">
        {value?.trim() && href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-medium hover:underline">
            {value}
          </a>
        ) : value?.trim() ? (
          <span className="text-gray-900 font-medium">{value}</span>
        ) : (
          <span className="text-gray-400 font-normal">{emptyLabel}</span>
        )}
      </dd>
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("panel-surface overflow-hidden", className)}>
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  )
}

/** Nyckeltal med förklaring vid hover/fokus på info-ikonen. */
function FieldWithMetricHint({
  label,
  value,
  hint,
}: {
  label: string
  value: string | null | undefined
  hint: string
}) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-baseline min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0 sm:w-44">
        <span className="inline-flex items-baseline gap-1.5">
          <span>{label}</span>
          <span className="group relative inline-flex translate-y-0.5">
            <button
              type="button"
              className="rounded-sm text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
              aria-label={`Förklaring av ${label}`}
            >
              <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-gray-700 shadow-lg group-hover:visible group-focus-within:visible"
            >
              {hint}
            </span>
          </span>
        </span>
      </dt>
      <dd className="text-sm text-gray-900 min-w-0 break-words">{value}</dd>
    </div>
  )
}

const BOKSLUT_TERM_HINTS: Record<string, string> = {
  Omsättning:
    "Bolagets intäkter från försäljning under räkenskapsåret; visar verksamhetens volym i kronor.",
  "Årets resultat":
    "Nettoresultat efter skatt för räkenskapsåret; i årsredovisningen redovisas det som årets vinst eller förlust.",
  EBITDA:
    "Rörelseresultat före räntor, skatt samt av- och nedskrivningar; ofta använt för att jämföra lönsamhet utan finansiell struktur och större avskrivningar.",
  Utdelning:
    "Utbetalt belopp till aktieägare enligt bolagsstämmans beslut, vanligtvis från bolagets vinstmedel.",
}

function mergedPostortLine(crm: BolagsfaktaCrmMerge): string | null {
  const zipCity = [crm.overviewZip, crm.overviewCity].filter(Boolean).join(" ").trim()
  const withCountry = [zipCity, crm.overviewCountry].filter(Boolean).join(zipCity && crm.overviewCountry ? ", " : "")
  return withCountry || null
}

export default function BolagsfaktaKundView({
  customerId,
  data,
  contacts,
  crmMerge,
  summaryStats,
  notes,
}: BolagsfaktaKundViewProps) {
  const m = crmMerge
  const firma = data.firmaNamn?.trim() || m.customerName
  const orgVis = formatOrgNr(data.orgNumberFormatted) || m.overviewOrgNr || null
  const phoneVis = data.phone?.trim() || m.overviewPhone || null
  const gataVis = data.gatuadress?.trim() || m.overviewAddress?.trim() || null
  const postadressVis = data.postadress?.trim() || mergedPostortLine(m)
  const seatRaw = data.seatLocation?.trim() || null
  const seatVis =
    seatRaw &&
    postadressVis &&
    postadressVis.toLowerCase().includes(seatRaw.toLowerCase())
      ? null
      : seatRaw

  return (
    <div className="space-y-6">
      <BolagsfaktaRefreshButton
        customerId={customerId}
        toolbar={{
          sourceUrl: data.sourceUrl,
          scrapedAt: data.scrapedAt,
          summaryStats,
        }}
      />

      <KundOversiktPanels notes={notes} />

      <Section title="Företag & registrering">
        <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3">
          <Field label="Firmanamn" value={firma} />
          <FieldOptional label="Organisationsnr" value={orgVis} emptyLabel="–" />
          <Field label="Bolagsform" value={data.bolagsformDetail} />
          <Field label="Status" value={data.registreringsStatus} />
          <Field label="Adress" value={gataVis} />
          <Field label="Postadress" value={postadressVis} />
          <Field label="Säte" value={seatVis} />
          <Field label="Telefon" value={phoneVis} />
          <FieldOptional
            label="Hemsida"
            value={m.overviewWebsite}
            href={m.overviewWebsiteHref}
            emptyLabel="Ingen webbplats registrerad"
          />
          <FieldOptional label="E-post" value={m.customerEmail} emptyLabel="–" />
          <Field label="Bolaget bildat" value={data.bolagetBildatText} />
          <Field label="Bolaget registrerat" value={data.bolagetRegistreratText} />
          <Field label="Antal anställda" value={data.antalAnstalldaText} />
          <Field label="Momsnr" value={data.momsregnr} />
          <Field label="Skapad" value={formatDate(m.createdAt)} />
        </dl>
      </Section>

      {(data.omsattningSenaste ||
        data.aretsResultatSenaste ||
        data.ebitdaSenaste ||
        data.utdelningSenaste) && (
        <Section title="Senaste bokslut (översikt)" className="overflow-visible">
          <dl className="grid gap-3 sm:grid-cols-2">
            <FieldWithMetricHint
              label="Omsättning"
              value={formatBolagsfaktaKsekSnippetAsSek(data.omsattningSenaste)}
              hint={BOKSLUT_TERM_HINTS.Omsättning}
            />
            <FieldWithMetricHint
              label="Årets resultat"
              value={formatBolagsfaktaKsekSnippetAsSek(data.aretsResultatSenaste)}
              hint={BOKSLUT_TERM_HINTS["Årets resultat"]}
            />
            <FieldWithMetricHint
              label="EBITDA"
              value={formatBolagsfaktaKsekSnippetAsSek(data.ebitdaSenaste)}
              hint={BOKSLUT_TERM_HINTS.EBITDA}
            />
            <FieldWithMetricHint
              label="Utdelning"
              value={formatBolagsfaktaKsekSnippetAsSek(data.utdelningSenaste)}
              hint={BOKSLUT_TERM_HINTS.Utdelning}
            />
          </dl>
        </Section>
      )}

      <Section title="Ansvariga & kontakter">
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400">Inga kontakter kopplade till bolaget.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Namn</th>
                  <th className="px-4 py-2">Roll</th>
                  <th className="px-4 py-2">E-post</th>
                  <th className="px-4 py-2">Telefon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-gray-900 hover:text-zinc-600">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.role ?? c.title ?? "–"}</td>
                    <td className="px-4 py-2 text-gray-600">{c.email ?? "–"}</td>
                    <td className="px-4 py-2 text-gray-600">{c.phone ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
