"use client"

import { useTheme } from "next-themes"
import { useThemeColor } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Moon, Sun, Monitor, Check, Palette, LayoutTemplate } from "lucide-react"

export function AppearanceForm() {
  const { setTheme, theme } = useTheme()
  const { themeColor, setThemeColor } = useThemeColor()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <CardTitle>Aparência do Painel</CardTitle>
        </div>
        <CardDescription>
          Personalize sua experiência visual no sistema. Essas alterações são salvas no seu navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* SEÇÃO 1: MODO (CLARO / ESCURO) */}
        <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              Modo de Exibição
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ThemeModeCard 
                    label="Claro" 
                    icon={<Sun className="w-8 h-8 mb-2" />} 
                    active={theme === 'light'} 
                    onClick={() => setTheme("light")} 
                />
                <ThemeModeCard 
                    label="Escuro" 
                    icon={<Moon className="w-8 h-8 mb-2" />} 
                    active={theme === 'dark'} 
                    onClick={() => setTheme("dark")} 
                />
                <ThemeModeCard 
                    label="Automático" 
                    icon={<Monitor className="w-8 h-8 mb-2" />} 
                    active={theme === 'system'} 
                    onClick={() => setTheme("system")} 
                />
            </div>
        </div>

        <div className="border-t" />

        {/* SEÇÃO 2: COR DE DESTAQUE */}
        <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
              Tema de Cores
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <ThemeColorCard 
                  color="theme-blue" 
                  hex="#02B5FF" 
                  label="Azul WeEat" 
                  active={themeColor === 'theme-blue'} 
                  onClick={() => setThemeColor('theme-blue')} 
                />
                <ThemeColorCard 
                  color="theme-zinc" 
                  hex="#18181B" 
                  label="Zinco Profissional" 
                  active={themeColor === 'theme-zinc'} 
                  onClick={() => setThemeColor('theme-zinc')} 
                />
                <ThemeColorCard 
                  color="theme-red" 
                  hex="#EA1D2C" 
                  label="Vermelho Food" 
                  active={themeColor === 'theme-red'} 
                  onClick={() => setThemeColor('theme-red')} 
                />
                <ThemeColorCard 
                  color="theme-orange" 
                  hex="#F97316" 
                  label="Laranja Vibrante" 
                  active={themeColor === 'theme-orange'} 
                  onClick={() => setThemeColor('theme-orange')} 
                />
                <ThemeColorCard 
                  color="theme-green" 
                  hex="#16A34A" 
                  label="Verde Fresh" 
                  active={themeColor === 'theme-green'} 
                  onClick={() => setThemeColor('theme-green')} 
                />
            </div>
        </div>

      </CardContent>
    </Card>
  )
}

// Sub-componente para os Cards de Modo
function ThemeModeCard({ label, icon, active, onClick }: any) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02]",
                active ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border text-muted-foreground"
            )}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
            {active && <div className="mt-2 text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">ATIVO</div>}
        </button>
    )
}

// Sub-componente para os Cards de Cor
function ThemeColorCard({ color, hex, label, active, onClick }: any) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "group relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-muted/50 overflow-hidden text-center h-full justify-center",
                active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
            )}
        >
            <div 
                className={cn(
                  "w-12 h-12 rounded-full shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300",
                  active ? "scale-110" : "group-hover:scale-105"
                )}
                style={{ backgroundColor: hex }} 
            >
              {active && <Check className="text-white w-6 h-6 drop-shadow-md" strokeWidth={3} />}
            </div>
            
            <span className={cn("text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
        </button>
    )
}
