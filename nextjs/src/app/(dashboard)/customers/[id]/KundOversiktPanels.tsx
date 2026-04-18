import { formatDate } from "@/lib/utils"

export type KundOversiktPanelsProps = {
  notes: string | null
}

export type KundCrmOnlyCompanyCardProps = {
  customerName: string
  overviewOrgNr: string | null | undefined
  overviewWebsite: string
  overviewWebsiteHref: string | undefined
  overviewPhone: string | null | undefined
  customerEmail: string | null
  overviewAddress: string | null | undefined
  overviewCity: string | null | undefined
  overviewZip: string | null | undefined
  overviewCountry: string | null | undefined
  createdAt: Date
}

function crmPostortLine(p: Pick<KundCrmOnlyCompanyCardProps, "overviewZip" | "overviewCity" | "overviewCountry">) {
  const zipCity = [p.overviewZip, p.overviewCity].filter(Boolean).join(" ").trim()
  return [zipCity, p.overviewCountry].filter(Boolean).join(zipCity && p.overviewCountry ? ", " : "") || null
}

/** CRM-ruta när Bolagsfakta-data saknas (samma fält som tidigare Översikt). */
export function KundCrmOnlyCompanyCard({
  customerName,
  overviewOrgNr,
  overviewWebsite,
  overviewWebsiteHref,
  overviewPhone,
  customerEmail,
  overviewAddress,
  overviewCity,
  overviewZip,
  overviewCountry,
  createdAt,
}: KundCrmOnlyCompanyCardProps) {
  const postadressVis = crmPostortLine({ overviewZip, overviewCity, overviewCountry })

  const rows: { label: string; value: string | null; href?: string; empty?: string }[] = [
    { label: "Firmanamn", value: customerName },
    { label: "Organisationsnr", value: overviewOrgNr ?? null, empty: "–" },
    {
      label: "Hemsida",
      value: overviewWebsite || null,
      href: overviewWebsiteHref,
      empty: "Ingen webbplats registrerad",
    },
    { label: "Telefon", value: overviewPhone ?? null },
    { label: "E-post", value: customerEmail?.trim() || null, empty: "–" },
    { label: "Adress", value: overviewAddress ?? null },
    { label: "Postadress", value: postadressVis },
    { label: "Skapad", value: formatDate(createdAt) },
  ]

  return (
    <div className="panel-surface overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Företagsinformation</h2>
      </div>
      <div className="p-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3">
          {rows.map((row) => {
            const hasVal = Boolean(row.value?.trim())
            if (!hasVal && !row.empty) return null
            return (
              <div
                key={row.label}
                className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-baseline min-w-0"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0 sm:w-44">
                  {row.label}
                </dt>
                <dd className="text-sm min-w-0 break-words">
                  {hasVal && row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 font-medium hover:underline"
                    >
                      {row.value}
                    </a>
                  ) : hasVal ? (
                    <span className="text-gray-900 font-medium">{row.value}</span>
                  ) : (
                    <span className="text-gray-400 font-normal">{row.empty}</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </div>
  )
}

/** Anteckningar på Bolagsfakta-fliken (under verktygsraden när BF-data finns). */
export default function KundOversiktPanels({ notes }: KundOversiktPanelsProps) {
  if (!notes?.trim()) return null

  return (
    <div className="panel-surface w-full">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
      </div>
      <div className="p-6">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
      </div>
    </div>
  )
}
