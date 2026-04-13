import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: { contacts: true },
    orderBy: { name: 'asc' },
  })

  const header = 'Namn,Org.nr,Stadium,Bransch,E-post,Telefon,Webbplats,Adress,Stad,Land,Kontaktperson,Kontakt E-post,Kontakt Telefon'
  const rows = customers.map((c) => {
    const contact = c.contacts[0]
    return [
      quote(c.name),
      c.orgNumber ?? '',
      c.stage,
      c.industry ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.website ?? '',
      quote(c.address ?? ''),
      c.city ?? '',
      c.country ?? '',
      contact ? quote(`${contact.firstName} ${contact.lastName}`) : '',
      contact?.email ?? '',
      contact?.phone ?? '',
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kunder-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

function quote(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
