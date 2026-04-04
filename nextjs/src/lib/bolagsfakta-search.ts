import * as cheerio from 'cheerio'
import { BASE_URL, launchStealthBrowser, newStealthPage, navigateAndGetHtml } from '@/lib/bolagsfakta-scraper'

/**
 * Searches bolagsfakta.se for a company by org number and returns the company page URL.
 * Returns null if no match is found.
 */
export async function searchBolagsfaktaByOrgNumber(orgNumber: string): Promise<string | null> {
  const digits = orgNumber.replace(/\D/g, '')
  if (digits.length !== 10) return null

  const searchUrl = `${BASE_URL}/sok/${digits}`
  const browser = await launchStealthBrowser()

  try {
    const page = await newStealthPage(browser)
    const html = await navigateAndGetHtml(page, searchUrl)

    // Check if we landed directly on a company page (redirect)
    const currentUrl = page.url()
    if (/bolagsfakta\.se\/\d{10}-/.test(currentUrl)) {
      return currentUrl.split('#')[0]
    }

    // Parse search results for a matching company link
    const $ = cheerio.load(html)
    let matchUrl: string | null = null

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (matchUrl) return
      if (!/\d{10}-/.test(href)) return
      // Check if the org number in the URL matches
      const m = href.match(/(\d{10})-/)
      if (m && m[1] === digits) {
        matchUrl = href.startsWith('http')
          ? href.split('#')[0]
          : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`.split('#')[0]
      }
    })

    return matchUrl
  } catch (e) {
    console.error('[bolagsfakta-search] Kunde inte söka:', e)
    return null
  } finally {
    await browser.close()
  }
}
