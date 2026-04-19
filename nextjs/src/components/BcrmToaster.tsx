"use client"

import * as Toast from "@radix-ui/react-toast"
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  X,
} from "lucide-react"
import { useSyncExternalStore } from "react"
import {
  getServerSnapshot,
  getSnapshot,
  removeToast,
  subscribe,
  type ToastRecord,
  type ToastVariant,
} from "@/lib/toast"
import { cn } from "@/lib/utils"

const variantRoot: Record<ToastVariant, string> = {
  default: cn(
    "border-[var(--surface-border)] bg-[var(--bcrm-white)] text-[var(--bcrm-foreground)] shadow-md",
    "dark:border-[var(--surface-border)] dark:bg-[#18181b] dark:text-[#f4f4f5]",
  ),
  success: cn(
    "border-[color-mix(in_srgb,var(--bcrm-green)_35%,var(--bcrm-gray))]",
    "bg-[color-mix(in_srgb,var(--bcrm-green)_10%,var(--bcrm-white))] text-[var(--bcrm-foreground)] shadow-md",
    "dark:border-[color-mix(in_srgb,var(--bcrm-green)_40%,#3f3f46)]",
    "dark:bg-[color-mix(in_srgb,var(--bcrm-green)_22%,#18181b)] dark:text-[#f4f4f5]",
  ),
  error: cn(
    "border-[color-mix(in_srgb,var(--bcrm-brown)_35%,var(--surface-border))]",
    "bg-[color-mix(in_srgb,var(--bcrm-beige)_45%,var(--bcrm-white))] text-[var(--bcrm-foreground)] shadow-md",
    "dark:border-[color-mix(in_srgb,var(--bcrm-brown)_50%,#3f3f46)]",
    "dark:bg-[color-mix(in_srgb,var(--bcrm-brown)_35%,#18181b)] dark:text-[#f4f4f5]",
  ),
  warning: cn(
    "border-[color-mix(in_srgb,var(--bcrm-beige)_40%,var(--bcrm-brown))] bg-[var(--bcrm-beige)]",
    "text-[var(--bcrm-brown)] shadow-md",
    "dark:border-[color-mix(in_srgb,var(--bcrm-beige)_25%,#52525b)]",
    "dark:bg-[color-mix(in_srgb,var(--bcrm-beige)_18%,#18181b)] dark:text-[var(--bcrm-beige)]",
  ),
  info: cn(
    "border-[var(--surface-border)]",
    "bg-[color-mix(in_srgb,var(--bcrm-green)_8%,var(--bcrm-gray))] text-[var(--bcrm-foreground)] shadow-md",
    "dark:border-[var(--surface-border)] dark:bg-[color-mix(in_srgb,var(--bcrm-green)_15%,#18181b)] dark:text-[#f4f4f5]",
  ),
}

const variantIcon: Record<ToastVariant, string> = {
  default: "text-[color-mix(in_srgb,var(--bcrm-brown)_45%,var(--bcrm-foreground))] dark:text-zinc-400",
  success: "text-[var(--bcrm-green)] dark:text-[color-mix(in_srgb,var(--bcrm-beige)_80%,var(--bcrm-green))]",
  error: "text-[var(--bcrm-brown)] dark:text-[var(--bcrm-beige)]",
  warning: "text-[var(--bcrm-brown)] dark:text-[var(--bcrm-beige)]",
  info: "text-[var(--bcrm-green)] dark:text-[color-mix(in_srgb,var(--bcrm-beige)_75%,var(--bcrm-green))]",
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const cls = cn("h-4 w-4 shrink-0", variantIcon[variant])
  switch (variant) {
    case "success":
      return <CheckCircle2 className={cls} aria-hidden />
    case "error":
      return <CircleAlert className={cls} aria-hidden />
    case "warning":
      return <AlertTriangle className={cls} aria-hidden />
    case "info":
      return <Info className={cls} aria-hidden />
    default:
      return <Info className={cls} aria-hidden />
  }
}

function ToastRow({ t }: { t: ToastRecord }) {
  const announce =
    t.variant === "error" || t.variant === "warning" ? "foreground" : "background"

  return (
    <Toast.Root
      type={announce}
      duration={t.duration}
      defaultOpen
      onOpenChange={(open) => {
        if (!open) removeToast(t.id)
      }}
      className={cn(
        "pointer-events-auto flex w-[min(100vw-2rem,22rem)] items-start gap-2.5 rounded-lg border p-3 pr-10",
        "text-[13.5px] font-medium leading-snug tracking-tight",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out]",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        variantRoot[t.variant],
      )}
    >
      <ToastIcon variant={t.variant} />
      <div className="min-w-0 flex-1 space-y-1">
        <Toast.Title className="font-semibold">{t.title}</Toast.Title>
        {t.description ? (
          <Toast.Description className="whitespace-pre-line text-[12.5px] font-normal opacity-90">
            {t.description}
          </Toast.Description>
        ) : null}
      </div>
      <Toast.Close
        type="button"
        aria-label="Stäng"
        className={cn(
          "absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md",
          "text-[color-mix(in_srgb,var(--bcrm-brown)_50%,var(--bcrm-foreground))] transition-colors",
          "hover:bg-[color-mix(in_srgb,var(--bcrm-brown)_8%,transparent)]",
          "dark:text-zinc-400 dark:hover:bg-white/10",
        )}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </Toast.Close>
    </Toast.Root>
  )
}

export function BcrmToaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <Toast.Provider label="Avisering" swipeDirection="right" duration={4000}>
      {list.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
      <Toast.Viewport
        className={cn(
          "fixed bottom-0 right-0 z-[100] m-0 flex max-h-screen w-full max-w-[100vw] flex-col gap-2 p-4 sm:bottom-4 sm:right-4 sm:max-w-[24rem]",
          "list-none outline-none",
        )}
        hotkey={["F8"]}
        label="Aviseringar (F8)"
      />
    </Toast.Provider>
  )
}
