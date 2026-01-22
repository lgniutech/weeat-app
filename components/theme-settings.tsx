"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Check, Moon, Sun, Monitor, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Cores predefinidas com suas variações para manter a harmonia do layout
const themeColors = [
  { 
    name: "Azul (Padrão)", 
    value: "#02B5FF", 
    light: "#F0F9FF", // Sky-50 (Para fundos claros)
    accent: "#8CDCFF" // Sky-300 (Para detalhes intermediários)
  },
  { 
    name: "Verde", 
    value: "#10B981", 
    light: "#ECFDF5", // Emerald-50
    accent: "#6EE7B7" // Emerald-300
  },
  { 
    name: "Roxo", 
    value: "#8B5CF6", 
    light: "#F5F3FF", // Violet-50
    accent: "#C4B5FD" // Violet-300
  },
  { 
    name: "Laranja", 
    value: "#F97316", 
    light: "#FFF7ED", // Orange-50
    accent: "#FDBA74" // Orange-300
  },
  { 
    name: "Vermelho", 
    value: "#EF4444", 
    light: "#FEF2F2", // Red-50
    accent: "#FCA5A5" // Red-300
  },
  { 
    name: "Rosa", 
    value: "#EC4899", 
    light: "#FDF2F8", // Pink-50
    accent: "#F9A8D4" // Pink-300
  },
]

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const [primaryColor, setPrimaryColor] = React.useState("#02B5FF")

  // Carregar a cor salva ao iniciar
  React.useEffect(() => {
    const savedColor = localStorage.getItem("theme-primary-color")
    if (savedColor) {
      // Encontra o objeto de cor completo baseado no valor salvo
      const colorObj = themeColors.find(c => c.value === savedColor) || themeColors[0]
      updateThemeVariables(colorObj)
    }
  }, [])

  // Função centralizada para atualizar todas as variáveis CSS
  const updateThemeVariables = (colorObj: typeof themeColors[0]) => {
    setPrimaryColor(colorObj.value)
    localStorage.setItem("theme-primary-color", colorObj.value)
    
    const root = document.documentElement
    
    // --- 1. Cor Principal (Botões, Textos Fortes) ---
    root.style.setProperty("--primary", colorObj.value)
    root.style.setProperty("--ring", colorObj.value)
    
    // --- 2. Sidebar (Menu Lateral) ---
    root.style.setProperty("--sidebar-primary", colorObj.value)
    root.style.setProperty("--sidebar-ring", colorObj.value)
    root.style.setProperty("--sidebar-accent-foreground", colorObj.value) // Texto do item ativo
    root.style.setProperty("--sidebar-accent", colorObj.light) // Fundo do item ativo (Era o "azulzinho")
    
    // --- 3. Elementos Secundários e Acentos ---
    root.style.setProperty("--secondary-foreground", colorObj.value)
    root.style.setProperty("--secondary", colorObj.light) // Badges e fundos secundários
    
    root.style.setProperty("--accent-foreground", "#0F172A") // Mantém texto escuro para contraste
    root.style.setProperty("--accent", colorObj.accent) // Hover e detalhes
    
    // --- 4. Gráficos (Para manter consistência visual) ---
    root.style.setProperty("--chart-1", colorObj.value)
    root.style.setProperty("--chart-2", colorObj.accent)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Personalização</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cartão de Modo (Claro/Escuro) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Escolha como o DeliveryPro se apresenta para você.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                className={`flex flex-col items-center gap-2 h-24 ${theme === 'light' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setTheme("light")}
              >
                <Sun className="h-6 w-6" />
                <span>Claro</span>
              </Button>
              <Button
                variant="outline"
                className={`flex flex-col items-center gap-2 h-24 ${theme === 'dark' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-6 w-6" />
                <span>Escuro</span>
              </Button>
              <Button
                variant="outline"
                className={`flex flex-col items-center gap-2 h-24 ${theme === 'system' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-6 w-6" />
                <span>Sistema</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cartão de Cor Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Cor do Tema
            </CardTitle>
            <CardDescription>
              Selecione a cor de destaque para botões e elementos ativos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {themeColors.map((colorObj) => (
                <button
                  key={colorObj.value}
                  onClick={() => updateThemeVariables(colorObj)}
                  className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-border transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ backgroundColor: colorObj.value }}
                  title={colorObj.name}
                >
                  {primaryColor === colorObj.value && (
                    <Check className="h-6 w-6 text-white drop-shadow-md" />
                  )}
                  <span className="sr-only">{colorObj.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
