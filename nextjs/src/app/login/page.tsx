'use client'

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f4f7ff] dark:bg-zinc-950 px-4 overflow-hidden">

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[460px] rounded-full bg-blue-200/45 dark:bg-blue-900/12 blur-3xl" />

      <div
        className="panel-surface relative z-10 w-full max-w-[380px] overflow-hidden"
        style={{ animation: "fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-800 via-blue-500 to-blue-400" />

        <div className="px-8 pt-8 pb-9 flex flex-col items-center gap-7">

          <div className="flex flex-col items-center gap-2.5">
            <div
              className="h-14 w-14 rounded-2xl overflow-hidden shadow-md shadow-blue-200/70 dark:shadow-blue-900/40 ring-1 ring-blue-100/80 dark:ring-blue-800/40"
            >
              <Image
                src="/bitrate-logo.png"
                alt="Bitrate CRM"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                Bitrate CRM
              </p>
              <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-gray-400 dark:text-zinc-500 mt-1">
                Internt arbetsverktyg
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 dark:bg-zinc-800" />

          {error === "no-account" && (
            <div className="w-full rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-4 py-3">
              <p className="text-[13px] text-red-700 dark:text-red-400 text-center font-medium leading-relaxed">
                Du har inte behörighet till systemet. Ditt Discord-konto är inte kopplat till något användarkonto.
              </p>
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-[13px] text-gray-500 dark:text-zinc-400 text-center leading-relaxed">
              Logga in med ditt Discord-konto för att fortsätta
            </p>

            <Button
              variant="default"
              size="lg"
              className="w-full gap-3 text-[13.5px] font-semibold tracking-wide"
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-[18px] h-[18px] shrink-0"
                aria-hidden
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.034.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Logga in med Discord
            </Button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
