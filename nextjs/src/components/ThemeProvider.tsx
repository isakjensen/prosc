'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'fullstack-theme'
/** Tidigare ProSC-nyckel — läses en gång så befintliga användare behåller tema. */
const LEGACY_THEME_STORAGE_KEY = 'prosc-theme'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored =
      (localStorage.getItem(THEME_STORAGE_KEY) ??
        localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) as Theme | null
    return stored ?? 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(sys)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  function setTheme(t: Theme) {
    localStorage.setItem(THEME_STORAGE_KEY, t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
