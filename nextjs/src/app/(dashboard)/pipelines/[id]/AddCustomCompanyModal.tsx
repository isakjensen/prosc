"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast"
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface Props {
  pipelineId: string
  isOpen: boolean
  onClose: () => void
}

export default function AddCustomCompanyModal({ pipelineId, isOpen, onClose }: Props) {
  const router = useRouter()
  const [orgNummer, setOrgNummer] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = orgNummer.trim()
    if (!trimmed) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/companies/add-custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgNummer: trimmed }),
      })

      const data = (await res.json().catch(() => ({}))) as { namn?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? "Något gick fel. Försök igen.")
        return
      }

      toast.success(`${data.namn ?? "Företaget"} har lagts till`)
      handleClose()
      router.refresh()
    } catch {
      setError("Något gick fel. Försök igen.")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setOrgNummer("")
    setError("")
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Lägg till företag"
      description="Ange organisationsnummer för att söka upp och lägga till ett specifikt företag från Bolagsfakta. Detaljdata hämtas automatiskt."
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Organisationsnummer <span className="text-red-400 normal-case tracking-normal">*</span>
              </label>
              <Input
                value={orgNummer}
                onChange={e => setOrgNummer(e.target.value)}
                placeholder="T.ex. 556123-4567"
                disabled={loading}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 leading-snug">{error}</p>
            )}
            {loading && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                Söker på Bolagsfakta… detta kan ta några sekunder
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Avbryt
          </Button>
          <Button type="submit" disabled={loading || !orgNummer.trim()}>
            {loading ? "Söker…" : "Lägg till"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
