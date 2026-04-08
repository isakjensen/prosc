'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import EditCustomerModal from '@/components/EditCustomerModal'
import EditContactModal from '@/components/EditContactModal'

interface CustomerData {
  id: string
  name: string
  orgNumber?: string | null
  industry?: string | null
  website?: string | null
  bolagsfaktaSourceUrl?: string | null
  address?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

interface ContactData {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  title?: string | null
  role?: string | null
  notes?: string | null
}

export function EditCustomerButton({ customer }: { customer: CustomerData }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <Pencil className="h-3.5 w-3.5" />
        Redigera
      </button>
      <EditCustomerModal isOpen={open} onClose={() => setOpen(false)} customer={customer} />
    </>
  )
}

export function EditContactButton({ contact }: { contact: ContactData }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
        title="Redigera kontakt"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <EditContactModal isOpen={open} onClose={() => setOpen(false)} contact={contact} />
    </>
  )
}
