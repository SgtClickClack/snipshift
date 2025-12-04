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
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove("light", "dark")
      
      // Force clean state
      root.style.backgroundColor = ""
      root.style.colorScheme = ""

      let activeTheme = currentTheme
      if (currentTheme === "system") {
        activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      }

      root.classList.add(activeTheme)
      
      // Enforce background colors directly on the root element
      if (activeTheme === "light") {
        root.style.backgroundColor = "#ffffff"
        root.style.colorScheme = "light"
      } else {
        root.style.backgroundColor = "#111418"
        root.style.colorScheme = "dark"
      }
      
      // Update meta theme-color for mobile status bars
      let metaThemeColor = document.querySelector("meta[name='theme-color']")
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta")
        metaThemeColor.setAttribute("name", "theme-color")
        document.head.appendChild(metaThemeColor)
      }
      
      metaThemeColor.setAttribute(
        "content", 
        activeTheme === "dark" ? "#111418" : "#ffffff"
      )
    }

    applyTheme(theme)

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => applyTheme("system")
      
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
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

