import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { BolagsfaktaData, Contact } from "@prisma/client"
import BolagsfaktaRefreshButton from "./BolagsfaktaRefreshButton"

export type BolagsfaktaKundViewProps = {
  customerId: string
  data: BolagsfaktaData
  contacts: Pick<Contact, "id" | "firstName" | "lastName" | "role" | "title" | "email" | "phone">[]
}

type SniRow = { kod: string; benamning: string }

function formatOrgNr(s: string | null | undefined): string | null {
  if (!s) return null
  const d = s.replace(/\D/g, "")
  if (d.length !== 10) return s
  return `${d.slice(0, 6)}-${d.slice(6)}`
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 sm:items-baseline">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0 sm:w-44">{label}</dt>
      <dd className="text-sm text-gray-900 min-w-0 break-words">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-surface overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  )
}

export default function BolagsfaktaKundView({ customerId, data, contacts }: BolagsfaktaKundViewProps) {
  const sniList = (data.sniPoster as unknown as SniRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Senast hämtad från Bolagsfakta:{" "}
          <time dateTime={data.scrapedAt.toISOString()} className="font-medium text-gray-700">
            {data.scrapedAt.toLocaleString("sv-SE")}
          </time>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <BolagsfaktaRefreshButton customerId={customerId} />
          {data.sourceUrl && (
            <Link
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Öppna på Bolagsfakta
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <Section title="Registreringsuppgifter">
        <dl className="space-y-3">
          <Field label="Firmanamn" value={data.firmaNamn} />
          <Field label="Organisationsnummer" value={formatOrgNr(data.orgNumberFormatted)} />
          <Field label="Bolagsform" value={data.bolagsformDetail} />
          <Field label="Status" value={data.registreringsStatus} />
          <Field label="Gatuadress" value={data.gatuadress} />
          <Field label="Postadress" value={data.postadress} />
          <Field label="Säte" value={data.seatLocation} />
          <Field label="Telefon" value={data.phone} />
          <Field label="Bolaget bildat" value={data.bolagetBildatText} />
          <Field label="Bolaget registrerat" value={data.bolagetRegistreratText} />
          <Field label="MOMSNUMMER" value={data.momsregnr} />
        </dl>
      </Section>

      {(data.omsattningSenaste ||
        data.aretsResultatSenaste ||
        data.ebitdaSenaste ||
        data.utdelningSenaste) && (
        <Section title="Senaste bokslut (översikt)">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Omsättning" value={data.omsattningSenaste} />
            <Field label="Årets resultat" value={data.aretsResultatSenaste} />
            <Field label="EBITDA" value={data.ebitdaSenaste} />
            <Field label="Utdelning" value={data.utdelningSenaste} />
          </dl>
        </Section>
      )}

      {sniList.length > 0 && (
        <Section title="SNI-koder">
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Kod</th>
                  <th className="px-4 py-2">Benämning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sniList.map((row) => (
                  <tr key={`${row.kod}-${row.benamning}`}>
                    <td className="px-4 py-2 font-mono text-gray-800">{row.kod}</td>
                    <td className="px-4 py-2 text-gray-700">{row.benamning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Övrigt">
        <dl className="space-y-3">
          <Field label="Verklig huvudman" value={data.verkligHuvudman} />
          <Field label="Koncernmoder" value={data.koncernModerNamn} />
          <Field label="Antal anställda" value={data.antalAnstalldaText} />
          <Field
            label="Primär bransch (SNI)"
            value={
              data.sniKodPrimary || data.sniBenamningPrimary
                ? [data.sniKodPrimary, data.sniBenamningPrimary].filter(Boolean).join(" – ")
                : null
            }
          />
        </dl>
      </Section>

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
                      <Link href={`/kontakter/${c.id}`} className="font-medium text-gray-900 hover:text-zinc-600">
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
