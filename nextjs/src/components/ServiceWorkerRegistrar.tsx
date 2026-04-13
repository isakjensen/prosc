"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister()
      })
      if ("caches" in globalThis) {
        void caches.keys().then((keys) => {
          for (const key of keys) void caches.delete(key)
        })
      }
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err)
    })
  }, [])

  return null
}
