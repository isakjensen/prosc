import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Bolagsfakta lagrar nyckeltal som t.ex. "64 000 KSEK" (tusental kronor).
 * Visar motsvarande belopp i hela SEK (t.ex. "64 000 000 kr").
 */
export function formatBolagsfaktaKsekSnippetAsSek(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  const m = trimmed.match(/^(-?[\d\s]+)\s*KSEK$/i)
  if (!m) return trimmed
  const ksek = parseInt(m[1].replace(/\s/g, ''), 10)
  if (Number.isNaN(ksek)) return trimmed
  const sek = ksek * 1000
  const formatted = new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: 0,
  }).format(sek)
  return `${formatted} kr`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '–'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '–'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}
