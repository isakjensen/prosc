export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export type ToastOptions = {
  description?: string
  duration?: number
}

export type ToastRecord = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
}

let toasts: ToastRecord[] = []
const listeners = new Set<() => void>()
const EMPTY_TOASTS: ToastRecord[] = []

function emit() {
  for (const l of listeners) l()
}

export function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getSnapshot(): ToastRecord[] {
  return toasts
}

export function getServerSnapshot(): ToastRecord[] {
  return EMPTY_TOASTS
}

function genId() {
  return `toast-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function push(record: {
  id?: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}) {
  const id = record.id ?? genId()
  toasts = [
    ...toasts,
    {
      id,
      title: record.title,
      description: record.description,
      variant: record.variant,
      duration: record.duration ?? 4000,
    },
  ]
  emit()
  return id
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function show(variant: ToastVariant, message: string, options?: ToastOptions) {
  push({
    title: message,
    description: options?.description,
    variant,
    duration: options?.duration,
  })
}

/** Bitrate CRM–styled toasts (Ubuntu + palette via globals.css). */
export const toast = {
  success: (message: string, options?: ToastOptions) => show("success", message, options),
  error: (message: string, options?: ToastOptions) => show("error", message, options),
  info: (message: string, options?: ToastOptions) => show("info", message, options),
  warning: (message: string, options?: ToastOptions) => show("warning", message, options),
  message: (message: string, options?: ToastOptions) => show("default", message, options),
}
