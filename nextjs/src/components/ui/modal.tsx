'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Extra classes on the dialog panel (e.g. rounded-2xl) */
  panelClassName?: string
  children: React.ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  panelClassName,
  children,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const maxWidth = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size]

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] overflow-x-hidden overflow-y-auto no-scrollbar overscroll-contain">
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
              className={cn(
                'relative z-10 w-full bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200/90 dark:border-zinc-700/60 overflow-hidden',
                'rounded-t-2xl sm:rounded-xl max-h-[95dvh] sm:max-h-none overflow-y-auto no-scrollbar overscroll-contain',
                maxWidth,
                panelClassName,
              )}
            >
              {title && (
                <div className="sticky top-0 bg-gradient-to-b from-zinc-50/90 to-white dark:from-zinc-900 dark:to-zinc-900 flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 z-10">
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                      {title}
                    </h2>
                    {description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-md">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'px-6 py-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto no-scrollbar',
        className,
      )}
    >
      {children}
    </div>
  )
}
