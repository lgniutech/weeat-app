"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

// Tipos de temas disponíveis
type ThemeColor = "theme-blue" | "theme-zinc" | "theme-red" | "theme-orange" | "theme-green"

interface ThemeColorContextType {
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void
}

const ThemeColorContext = React.createContext<ThemeColorContextType>({
  themeColor: "theme-blue",
  setThemeColor: () => null,
})

export function useThemeColor() {
  return React.useContext(ThemeColorContext)
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [themeColor, setThemeColor] = React.useState<ThemeColor>("theme-blue")
  const [mounted, setMounted] = React.useState(false)

  // 1. Ao montar, pega a cor salva no navegador
  React.useEffect(() => {
    setMounted(true)
    const savedColor = localStorage.getItem("admin-theme-color") as ThemeColor
    if (savedColor) {
      setThemeColor(savedColor)
    }
  }, [])

  // 2. Quando a cor mudar, atualiza a classe do <body>
  React.useEffect(() => {
    if (!mounted) return

    const root = document.body
    // Remove qualquer tema antigo
    root.classList.remove("theme-blue", "theme-zinc", "theme-red", "theme-orange", "theme-green")
    // Adiciona o novo
    root.classList.add(themeColor)
    // Salva para a próxima visita
    localStorage.setItem("admin-theme-color", themeColor)
  }, [themeColor, mounted])

  // Evita piscar conteúdo incorreto no carregamento
  if (!mounted) {
    return null // ou um loading skeleton se preferir
  }

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      <NextThemesProvider {...props}>
        {children}
      </NextThemesProvider>
    </ThemeColorContext.Provider>
  )
}
