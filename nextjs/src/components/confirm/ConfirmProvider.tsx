"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertTriangle } from "lucide-react"
import { Modal, ModalFooter } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ConfirmOptions = {
  title: string
  description?: string
  /** Korta punkter under beskrivningen (visas tydligare vid variant danger). */
  bullets?: string[]
  confirmLabel?: string
  cancelLabel?: string
  /** destructive = röd bekräftelseknapp (t.ex. radering) */
  variant?: "default" | "danger"
  /** Visar tydlig varning att åtgärden inte kan ångras (endast vid danger-layout i brödtext). */
  irreversible?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm måste användas inom ConfirmProvider")
  }
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    { open: false } | { open: true; options: ConfirmOptions }
  >({ open: false })
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false)
        resolverRef.current = null
      }
      resolverRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const finish = useCallback((result: boolean) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setState({ open: false })
    resolve?.(result)
  }, [])

  const options = state.open ? state.options : null
  const isDanger = options?.variant === "danger"
  const useDangerBody =
    isDanger && Boolean(options?.description || (options?.bullets && options.bullets.length > 0))

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          isOpen
          onClose={() => finish(false)}
          title={options.title}
          description={useDangerBody ? undefined : options.description}
          size={isDanger ? "xl" : "sm"}
          dense={isDanger}
          rootClassName="z-[10050]"
          panelClassName={cn(
            isDanger &&
              "ring-1 ring-red-200/70 dark:ring-red-900/50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]",
          )}
        >
          {useDangerBody ? (
            <div className="px-5 py-3 sm:py-3.5">
              <div className="flex gap-3 sm:gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-red-50 text-red-600 shadow-inner shadow-red-200/40 ring-1 ring-red-200/60 dark:from-red-950/80 dark:to-red-950/40 dark:text-red-400 dark:ring-red-800/60"
                  aria-hidden
                >
                  <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
                  {options.description ? (
                    <p className="text-sm sm:text-[15px] leading-snug text-zinc-700 dark:text-zinc-200">
                      {options.description}
                    </p>
                  ) : null}
                  {options.bullets && options.bullets.length > 0 ? (
                    <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {options.bullets.map((line) => (
                        <li key={line} className="flex gap-2.5">
                          <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400/90 dark:bg-red-500/80"
                            aria-hidden
                          />
                          <span className="leading-snug">{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {options.irreversible ? (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-red-600/90 dark:text-red-400/90 pt-0.5">
                      Åtgärden går inte att ångra
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <ModalFooter
            className={cn(
              "gap-2.5 sm:gap-3",
              isDanger
                ? "border-t border-zinc-100 bg-zinc-50/95 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/50"
                : "border-t border-zinc-100 dark:border-zinc-800",
            )}
          >
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-w-[5.5rem] border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
              )}
              onClick={() => finish(false)}
            >
              {options.cancelLabel ?? "Avbryt"}
            </Button>
            <Button
              type="button"
              variant={options.variant === "danger" ? "destructive" : "default"}
              className={cn(
                options.variant === "danger" &&
                  "min-w-[5.5rem] font-semibold shadow-md shadow-red-900/15 dark:shadow-red-950/40",
              )}
              onClick={() => finish(true)}
            >
              {options.confirmLabel ?? "Bekräfta"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}
