'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'

export default function KnowledgeBaseActions({ categories }: { categories: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '', published: false })

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/kunskapsbas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setOpen(false)
        setForm({ title: '', content: '', category: '', published: false })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Ny artikel</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Ny artikel" size="lg">
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <Input value={form.title} onChange={(e) => update('title', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <Input
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="T.ex. Process, FAQ, Intern"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Innehåll *</label>
              <textarea
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                rows={10}
                required
                className="flex w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update('published', e.target.checked)}
                className="rounded"
              />
              Publicera direkt
            </label>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Skapar...' : 'Spara artikel'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
