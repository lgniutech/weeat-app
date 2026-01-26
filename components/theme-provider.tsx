"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

// Contexto para a Cor do Tema
type ThemeColor = "theme-zinc" | "theme-red" | "theme-blue" | "theme-orange" | "theme-green"

interface ThemeColorContextType {
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void
}

const ThemeColorContext = React.createContext<ThemeColorContextType>({
  themeColor: "theme-zinc",
  setThemeColor: () => null,
})

export function useThemeColor() {
  return React.useContext(ThemeColorContext)
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [themeColor, setThemeColor] = React.useState<ThemeColor>("theme-zinc")
  const [mounted, setMounted] = React.useState(false)

  // Carregar cor salva ao iniciar
  React.useEffect(() => {
    setMounted(true)
    const savedColor = localStorage.getItem("admin-theme-color") as ThemeColor
    if (savedColor) {
      setThemeColor(savedColor)
    }
  }, [])

  // Atualizar a cor no <body>
  React.useEffect(() => {
    if (!mounted) return

    const root = document.body
    // Remove classes antigas
    root.classList.remove("theme-zinc", "theme-red", "theme-blue", "theme-orange", "theme-green")
    // Adiciona nova
    root.classList.add(themeColor)
    // Salva preferência
    localStorage.setItem("admin-theme-color", themeColor)
  }, [themeColor, mounted])

  // Evita flash de conteúdo não estilizado
  if (!mounted) {
    return null 
  }

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      <NextThemesProvider {...props}>
        {children}
      </NextThemesProvider>
    </ThemeColorContext.Provider>
  )
}
