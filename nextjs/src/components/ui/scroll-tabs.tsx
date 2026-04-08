'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface ScrollTabsProps {
  children: React.ReactNode
}

export default function ScrollTabs({ children }: ScrollTabsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [check])

  return (
    <div className="relative border-b border-gray-200 dark:border-zinc-800">
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
        style={{
          opacity: canScrollLeft ? 1 : 0,
          background: 'linear-gradient(to right, var(--scroll-tab-bg, white), transparent)',
        }}
      />
      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
        style={{
          opacity: canScrollRight ? 1 : 0,
          background: 'linear-gradient(to left, var(--scroll-tab-bg, white), transparent)',
        }}
      />

      <div
        ref={ref}
        className="flex gap-1 overflow-x-auto no-scrollbar"
      >
        {children}
      </div>
    </div>
  )
}
