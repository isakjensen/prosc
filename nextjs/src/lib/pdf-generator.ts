/**
 * Simple HTML-to-PDF generator using the built-in Playwright (already a dependency for scraping).
 * Falls back to returning HTML if Playwright isn't available.
 */

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface PdfData {
  type: 'quote' | 'invoice'
  number: string
  title: string
  customerName: string
  customerAddress?: string | null
  customerCity?: string | null
  customerOrgNumber?: string | null
  issueDate: string
  dueDate?: string | null
  validUntil?: string | null
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  notes?: string | null
  // Company info from SystemSetting
  companyName?: string
  companyOrgNumber?: string
  companyAddress?: string
  companyCity?: string
}

function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(amount)
}

export function generateDocumentHtml(data: PdfData): string {
  const typeLabel = data.type === 'quote' ? 'Offert' : 'Faktura'

  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #18181b; }
  .header .number { font-size: 14px; color: #71717a; margin-top: 4px; }
  .company { text-align: right; font-size: 12px; color: #52525b; line-height: 1.6; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 8px; }
  .info-box p { font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; padding: 10px 12px; border-bottom: 2px solid #e4e4e7; }
  th:nth-child(n+2) { text-align: right; }
  td { padding: 12px; border-bottom: 1px solid #f4f4f5; }
  td:nth-child(n+2) { text-align: right; }
  .totals { margin-left: auto; width: 250px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.total { border-top: 2px solid #18181b; font-weight: 700; font-size: 15px; padding-top: 10px; margin-top: 4px; }
  .notes { margin-top: 30px; padding: 16px; background: #fafafa; border-radius: 8px; font-size: 12px; color: #52525b; }
  .notes h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 8px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #a1a1aa; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${typeLabel}</h1>
      <p class="number">${data.number}</p>
    </div>
    <div class="company">
      ${data.companyName ? `<strong>${data.companyName}</strong><br>` : ''}
      ${data.companyOrgNumber ? `Org.nr: ${data.companyOrgNumber}<br>` : ''}
      ${data.companyAddress ? `${data.companyAddress}<br>` : ''}
      ${data.companyCity ?? ''}
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Kund</h3>
      <p>
        <strong>${data.customerName}</strong><br>
        ${data.customerOrgNumber ? `Org.nr: ${data.customerOrgNumber}<br>` : ''}
        ${data.customerAddress ?? ''}${data.customerCity ? `, ${data.customerCity}` : ''}
      </p>
    </div>
    <div class="info-box" style="text-align: right;">
      <h3>Detaljer</h3>
      <p>
        ${data.type === 'invoice' ? `Utfärdad: ${data.issueDate}<br>` : `Datum: ${data.issueDate}<br>`}
        ${data.dueDate ? `Förfallodatum: ${data.dueDate}<br>` : ''}
        ${data.validUntil ? `Giltig till: ${data.validUntil}<br>` : ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Beskrivning</th>
        <th>Antal</th>
        <th>Á-pris</th>
        <th>Summa</th>
      </tr>
    </thead>
    <tbody>
      ${data.lineItems.map((item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${formatSEK(item.unitPrice)}</td>
        <td>${formatSEK(item.total)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Delsumma</span><span>${formatSEK(data.subtotal)}</span></div>
    <div class="row"><span>Moms (25%)</span><span>${formatSEK(data.tax)}</span></div>
    <div class="row total"><span>Totalt</span><span>${formatSEK(data.total)}</span></div>
  </div>

  ${data.notes ? `<div class="notes"><h3>Anteckningar</h3><p>${data.notes}</p></div>` : ''}

  <div class="footer">
    ${data.companyName ?? 'BCRM'} &mdash; Genererad ${new Date().toLocaleDateString('sv-SE')}
  </div>
</body>
</html>`
}

export async function generatePdf(html: string): Promise<Uint8Array> {
  // Use Playwright to render PDF (already installed for scraping)
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}
