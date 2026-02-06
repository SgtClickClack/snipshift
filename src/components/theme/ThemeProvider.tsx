import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme: _defaultTheme = "dark",
  storageKey: _storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  // Force dark mode - theme state is kept for compatibility but always returns "dark"
  const [_theme] = useState<Theme>("dark")

  useEffect(() => {
    const root = window.document.documentElement

    // Always force dark mode
    root.classList.remove("light", "dark")
    root.classList.add("dark")
    root.style.colorScheme = "dark"

    // Update meta theme-color for mobile status bars
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "hsl(240, 10%, 3.9%)")
    }
  }, [])

  const value = {
    theme: "dark" as Theme,
    setTheme: () => {
      // Theme changes are disabled - always dark mode
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

