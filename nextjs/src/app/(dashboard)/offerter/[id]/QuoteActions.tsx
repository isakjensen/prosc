'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  quoteId: string
  currentStatus: string
}

export default function QuoteActions({ quoteId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string) {
    setLoading(true)
    try {
      await fetch(`/api/offerter/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus === 'DRAFT' && (
        <Button
          variant="default"
          size="sm"
          disabled={loading}
          onClick={() => changeStatus('SENT')}
        >
          Skicka offert
        </Button>
      )}
      {(currentStatus === 'DRAFT' || currentStatus === 'SENT') && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => changeStatus('ACCEPTED')}
          >
            Markera accepterad
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={() => changeStatus('REJECTED')}
          >
            Markera avvisad
          </Button>
        </>
      )}
      {currentStatus === 'SENT' && (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => changeStatus('EXPIRED')}
        >
          Markera utgången
        </Button>
      )}
    </div>
  )
}
