'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'

interface Props {
  customers: { id: string; name: string }[]
  projects: { id: string; name: string }[]
}

export default function CreateMeetingButton({ customers, projects }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    videoLink: '',
    customerId: '',
    projectId: '',
  })

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/moten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customerId: form.customerId || null,
          projectId: form.projectId || null,
        }),
      })
      if (res.ok) {
        setOpen(false)
        setForm({ title: '', description: '', startTime: '', endTime: '', location: '', videoLink: '', customerId: '', projectId: '' })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Nytt möte</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Skapa nytt möte" size="lg">
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <Input value={form.title} onChange={(e) => update('title', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starttid *</label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid *</label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plats</label>
                <Input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Kontor, Zoom, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Videolänk</label>
                <Input value={form.videoLink} onChange={(e) => update('videoLink', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kund</label>
                <select
                  value={form.customerId}
                  onChange={(e) => update('customerId', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                >
                  <option value="">Ingen kund</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                <select
                  value={form.projectId}
                  onChange={(e) => update('projectId', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                >
                  <option value="">Inget projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Skapar...' : 'Skapa möte'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
