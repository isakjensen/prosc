import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeOrgNumber, orgNumberLookupVariants } from '@/lib/swedish-org-number'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split('\n').filter((l) => l.trim())

  if (lines.length < 2) {
    return NextResponse.json({ error: 'Filen är tom eller saknar datarader' }, { status: 400 })
  }

  // Parse CSV header
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())

  const nameIdx = header.findIndex((h) => h.includes('namn') || h === 'name')
  if (nameIdx === -1) {
    return NextResponse.json({ error: 'Kolumnen "Namn" saknas i CSV-filen' }, { status: 400 })
  }

  const fieldMap: Record<string, string> = {
    'org.nr': 'orgNumber', orgnr: 'orgNumber', orgnumber: 'orgNumber',
    bransch: 'industry', industry: 'industry',
    'e-post': 'email', email: 'email', epost: 'email',
    telefon: 'phone', phone: 'phone',
    webbplats: 'website', website: 'website', web: 'website',
    adress: 'address', address: 'address',
    stad: 'city', city: 'city',
    land: 'country', country: 'country',
  }

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const name = values[nameIdx]?.trim()
    if (!name) {
      skipped++
      continue
    }

    const data: Record<string, string> = { name, stage: 'PROSPECT' }

    for (let j = 0; j < header.length; j++) {
      const field = fieldMap[header[j]]
      if (field && values[j]?.trim()) {
        data[field] = values[j].trim()
      }
    }

    try {
      const orgNorm = data.orgNumber ? normalizeOrgNumber(data.orgNumber) : null
      const orgStored = orgNorm ?? (data.orgNumber?.trim() || null)
      const orgLookup =
        orgNorm != null
          ? orgNumberLookupVariants(orgNorm)
          : orgStored
            ? [orgStored]
            : []

      if (orgLookup.length > 0) {
        const existing = await prisma.customer.findFirst({
          where: { orgNumber: { in: orgLookup } },
        })
        if (existing) {
          skipped++
          continue
        }
      }

      await prisma.customer.create({
        data: {
          name: data.name,
          stage: 'PROSPECT',
          orgNumber: orgStored,
          industry: data.industry || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          country: data.country || null,
        },
      })
      created++
    } catch (err) {
      errors.push(`Rad ${i + 1}: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    }
  }

  return NextResponse.json({ created, skipped, errors, total: lines.length - 1 })
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
