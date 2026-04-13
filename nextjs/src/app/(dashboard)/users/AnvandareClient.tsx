'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
}

export function CreateUserButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Ny användare</Button>
      <CreateUserModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function EditUserButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
        title="Redigera användare"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <EditUserModal isOpen={open} onClose={() => setOpen(false)} user={user} />
    </>
  )
}
