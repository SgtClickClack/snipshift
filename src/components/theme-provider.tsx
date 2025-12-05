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
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    let systemTheme: "light" | "dark" = "light"
    if (theme === "system") {
      systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }

    const activeTheme = theme === "system" ? systemTheme : theme

    root.classList.add(activeTheme)
    root.style.colorScheme = activeTheme

    // Update meta theme-color for mobile status bars
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) {
      const backgroundColor = activeTheme === "dark" 
        ? "#1a1a1a" 
        : "#ffffff"
      metaThemeColor.setAttribute("content", backgroundColor)
    }
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      const systemTheme = e.matches ? "dark" : "light"
      root.classList.add(systemTheme)
      root.style.colorScheme = systemTheme

      // Update meta theme-color for mobile status bars
      const metaThemeColor = document.querySelector("meta[name='theme-color']")
      if (metaThemeColor) {
        const backgroundColor = systemTheme === "dark" 
          ? "#1a1a1a" 
          : "#ffffff"
        metaThemeColor.setAttribute("content", backgroundColor)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
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

