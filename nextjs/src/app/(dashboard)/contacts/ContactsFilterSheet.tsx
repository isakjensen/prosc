'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { Filter, ChevronDown, Check, X } from 'lucide-react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Company {
  id: string
  name: string
}

interface Props {
  companies: Company[]
  currentName?: string
  currentEmail?: string
  currentPhone?: string
  currentCustomerId?: string
  currentHasEmail?: boolean
  currentHasPhone?: boolean
}

export function ContactsFilterSheet({
  companies,
  currentName,
  currentEmail,
  currentPhone,
  currentCustomerId,
  currentHasEmail,
  currentHasPhone,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Lokalt formulär-state
  const [name, setName] = useState(currentName ?? '')
  const [email, setEmail] = useState(currentEmail ?? '')
  const [phone, setPhone] = useState(currentPhone ?? '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCustomerId ?? '')
  const [hasEmail, setHasEmail] = useState(currentHasEmail ?? false)
  const [hasPhone, setHasPhone] = useState(currentHasPhone ?? false)

  // Combobox-state
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companySearch, setCompanySearch] = useState('')

  // Synka formulär med aktuella props när sheeten öppnas
  useEffect(() => {
    if (open) {
      setName(currentName ?? '')
      setEmail(currentEmail ?? '')
      setPhone(currentPhone ?? '')
      setSelectedCompanyId(currentCustomerId ?? '')
      setHasEmail(currentHasEmail ?? false)
      setHasPhone(currentHasPhone ?? false)
      setCompanySearch('')
    }
  }, [open, currentName, currentEmail, currentPhone, currentCustomerId, currentHasEmail, currentHasPhone])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null

  const filteredCompanies = companySearch.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(companySearch.toLowerCase()),
      )
    : companies

  function applyFilters() {
    const params = new URLSearchParams()
    if (name.trim()) params.set('name', name.trim())
    if (email.trim()) params.set('email', email.trim())
    if (phone.trim()) params.set('phone', phone.trim())
    if (selectedCompanyId) params.set('customerId', selectedCompanyId)
    if (hasEmail) params.set('hasEmail', '1')
    if (hasPhone) params.set('hasPhone', '1')
    const qs = params.toString()
    router.push(`/contacts${qs ? '?' + qs : ''}`)
    setOpen(false)
  }

  function clearAll() {
    router.push('/contacts')
    setOpen(false)
  }

  const activeCount = [currentName, currentEmail, currentPhone, currentCustomerId,
    currentHasEmail && '1', currentHasPhone && '1'].filter(Boolean).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filtrera</span>
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-100 text-[10px] font-semibold text-white dark:text-zinc-900">
            {activeCount}
          </span>
        )}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Filtrera kontakter" size="md">
        <ModalBody>
          <div className="space-y-4">
            {/* Namn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                Namn
              </label>
              <Input
                placeholder="Sök på förnamn eller efternamn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Företag combobox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                Företag
              </label>
              <Popover.Root open={companyOpen} onOpenChange={setCompanyOpen}>
                <Popover.Trigger asChild>
                  <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                    <span className={selectedCompany ? 'text-gray-900 dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500'}>
                      {selectedCompany?.name ?? 'Alla företag'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={4}
                    className="z-[300] w-[var(--radix-popover-trigger-width)] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg outline-none"
                  >
                    <div className="border-b border-zinc-100 dark:border-zinc-800 p-2">
                      <input
                        autoFocus
                        placeholder="Sök företag..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                      <button
                        onClick={() => { setSelectedCompanyId(''); setCompanyOpen(false) }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Alla företag
                        {!selectedCompanyId && <Check className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />}
                      </button>
                      {filteredCompanies.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400 dark:text-zinc-500">Inga resultat</p>
                      ) : (
                        filteredCompanies.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCompanyId(c.id); setCompanyOpen(false) }}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="truncate">{c.name}</span>
                            {selectedCompanyId === c.id && <Check className="h-3.5 w-3.5 shrink-0 text-zinc-700 dark:text-zinc-300" />}
                          </button>
                        ))
                      )}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>

            {/* E-post */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                E-post
              </label>
              <Input
                placeholder="Sök på e-postadress..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                Telefon
              </label>
              <Input
                placeholder="Sök på telefonnummer..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
            </div>

            {/* Checkboxar */}
            <div className="space-y-2.5 pt-1">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={hasEmail}
                  onChange={(e) => setHasEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-zinc-800 focus:ring-zinc-500"
                />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Visa endast kontakter med e-post</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={hasPhone}
                  onChange={(e) => setHasPhone(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-zinc-800 focus:ring-zinc-500"
                />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Visa endast kontakter med telefonnummer</span>
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="mr-auto flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Rensa filter
            </button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={applyFilters}>
            Tillämpa
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
