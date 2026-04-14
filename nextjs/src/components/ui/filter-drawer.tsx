'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Responsive filter panel:
 *  - Mobile:  bottom sheet (slides up)
 *  - Desktop: right-side drawer (slides in from right)
 */
export function FilterDrawer({ isOpen, onClose, title, children }: FilterDrawerProps) {
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

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          {/* Mobile: bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-10 sm:hidden',
              'flex flex-col bg-white dark:bg-zinc-900 shadow-2xl',
              'border-t border-zinc-200/90 dark:border-zinc-700/60',
              'rounded-t-2xl max-h-[85dvh]',
            )}
          >
            {title && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto no-scrollbar overscroll-contain">
              {children}
            </div>
          </motion.div>

          {/* Desktop: right drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', duration: 0.38, bounce: 0.08 }}
            className={cn(
              'fixed top-0 right-0 bottom-0 z-10 hidden sm:flex',
              'flex-col w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl',
              'border-l border-zinc-200/90 dark:border-zinc-700/60',
            )}
          >
            {title && (
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto no-scrollbar overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
