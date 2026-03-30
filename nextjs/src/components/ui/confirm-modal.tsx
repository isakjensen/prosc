'use client'

import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Bekräfta',
  cancelLabel = 'Avbryt',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] overflow-y-auto no-scrollbar overscroll-contain">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onCancel}
              className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              className="relative z-10 w-full max-w-sm rounded-lg border border-gray-100 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${destructive ? 'bg-red-100' : 'bg-zinc-100'}`}>
                  <AlertTriangle className={`h-5 w-5 ${destructive ? 'text-red-600' : 'text-zinc-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500">{message}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    destructive
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-zinc-800 text-white hover:bg-zinc-900'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
