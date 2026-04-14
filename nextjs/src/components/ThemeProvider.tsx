"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useSession } from "next-auth/react"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "bcrm-theme"
/** Tidigare nycklar — läses en gång så befintliga användare behåller tema. */
const LEGACY_THEME_STORAGE_KEYS = ["fullstack-theme", "prosc-theme"] as const

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const raw =
    localStorage.getItem(THEME_STORAGE_KEY) ??
    LEGACY_THEME_STORAGE_KEYS.map((k) => localStorage.getItem(k)).find(Boolean)
  if (raw === "dark") return "dark"
  if (raw === "light") return "light"
  return "light"
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: "light", setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : "light",
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  // Uppdatera PWA status bar-färg dynamiskt
  useEffect(() => {
    const color = theme === "dark" ? "#18181b" : "#ffffff"
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }
    meta.content = color
  }, [theme])

  // localStorage är auktoritativt; session används bara för bootstrapping på ny enhet
  useEffect(() => {
    if (status === "loading") return
    if (status === "authenticated" && session?.user?.themePreference) {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (!stored) {
        const t = session.user.themePreference
        setThemeState(t)
        localStorage.setItem(THEME_STORAGE_KEY, t)
      }
    } else if (status === "unauthenticated") {
      setThemeState(readStoredTheme())
    }
  }, [status, session?.user?.themePreference])

  const setTheme = useCallback(
    async (t: Theme) => {
      setThemeState(t)
      localStorage.setItem(THEME_STORAGE_KEY, t)
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ themePreference: t }),
          })
          if (res.ok) {
            await update({ themePreference: t })
          }
        } catch {
          /* UI redan uppdaterad */
        }
      }
    },
    [status, update],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
