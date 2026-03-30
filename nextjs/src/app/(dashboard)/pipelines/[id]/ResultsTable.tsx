'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Result {
  id: string
  businessName: string
  address: string | null
  category: string | null
  website: string | null
  orgNumber: string | null
  employeeCount: number | null
  revenueKSEK: number | null
  status: string
  phone: string | null
  email: string | null
  rating: number | null
  reviewCount: number | null
  googleMapsUrl: string | null
  enrichmentData: string | null
  aiAnalysis: string | null
}

interface Props {
  results: Result[]
  totalCount: number
  resultStatusLabel: Record<string, string>
  resultStatusVariant: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'danger'>
}

function parseCity(address: string | null): string {
  if (!address) return '–'
  // Swedish addresses often end with "City" or "Postal City"
  const parts = address.split(',')
  if (parts.length > 1) {
    return parts[parts.length - 1].trim()
  }
  // Try to extract last word sequence after digits (postal code)
  const match = address.match(/\d{3}\s?\d{2}\s+(.+)$/)
  if (match) return match[1].trim()
  return '–'
}

export default function ResultsTable({ results: initialResults, totalCount, resultStatusLabel, resultStatusVariant }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)

  const visibleResults = initialResults.slice(0, visibleCount)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Företag</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Kategori</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Stad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Webbplats</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Org.nr</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Anst.</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Omsättning</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleResults.map((result) => (
              <>
                <tr
                  key={result.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === result.id ? null : result.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{result.businessName}</p>
                    {result.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{result.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{result.category ?? '–'}</td>
                  <td className="px-4 py-3 text-gray-600">{parseCity(result.address)}</td>
                  <td className="px-4 py-3">
                    {result.website ? (
                      <a
                        href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors text-xs truncate max-w-32 block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {result.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">Ingen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{result.orgNumber ?? '–'}</td>
                  <td className="px-4 py-3 text-gray-600">{result.employeeCount ?? '–'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {result.revenueKSEK ? `${result.revenueKSEK.toLocaleString('sv-SE')} tkr` : '–'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={resultStatusVariant[result.status] ?? 'gray'}>
                      {resultStatusLabel[result.status] ?? result.status}
                    </Badge>
                  </td>
                </tr>
                {expanded === result.id && (
                  <tr key={`${result.id}-expanded`} className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Kontaktuppgifter
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Adress</span>
                              <span className="text-gray-900">{result.address ?? '–'}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Telefon</span>
                              <span className="text-gray-900">{result.phone ?? '–'}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 shrink-0">E-post</span>
                              <span className="text-gray-900">{result.email ?? '–'}</span>
                            </div>
                            {result.rating && (
                              <div className="flex gap-2">
                                <span className="text-gray-500 w-20 shrink-0">Betyg</span>
                                <span className="text-gray-900">
                                  {result.rating} ★ ({result.reviewCount ?? 0} recensioner)
                                </span>
                              </div>
                            )}
                            {result.googleMapsUrl && (
                              <div className="flex gap-2">
                                <span className="text-gray-500 w-20 shrink-0">Google Maps</span>
                                <a
                                  href={result.googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                                >
                                  Öppna
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {(result.enrichmentData || result.aiAnalysis) && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                              Analys
                            </h4>
                            {result.aiAnalysis && (() => {
                              try {
                                const analysis = JSON.parse(result.aiAnalysis)
                                return (
                                  <div className="space-y-1 text-sm">
                                    {analysis.summary && (
                                      <p className="text-gray-700">{analysis.summary}</p>
                                    )}
                                    {analysis.score !== undefined && (
                                      <p className="text-gray-500">
                                        Poäng: <span className="font-semibold text-gray-900">{analysis.score}</span>
                                      </p>
                                    )}
                                  </div>
                                )
                              } catch {
                                return <p className="text-xs text-gray-400">Kunde inte visa analys</p>
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {totalCount > visibleCount && (
        <div className="border-t border-gray-200 p-4 text-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 50)}
          >
            Visa fler ({totalCount - visibleCount} kvar)
          </Button>
        </div>
      )}
    </div>
  )
}
