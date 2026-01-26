"use client"

import { useTheme } from "next-themes"
import { useThemeColor } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Moon, Sun, Monitor, Check, Palette, Laptop } from "lucide-react"

export function AppearanceForm() {
  const { setTheme, theme } = useTheme()
  const { themeColor, setThemeColor } = useThemeColor()

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <CardTitle>Aparência do Sistema</CardTitle>
        </div>
        <CardDescription>
          Personalize como você vê o painel administrativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* SEÇÃO 1: MODO (CLARO / ESCURO) */}
        <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Modo de Exibição
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ThemeModeCard 
                    label="Claro" 
                    description="Visual limpo e iluminado"
                    icon={<Sun className="w-6 h-6" />} 
                    active={theme === 'light'} 
                    onClick={() => setTheme("light")} 
                />
                <ThemeModeCard 
                    label="Escuro" 
                    description="Confortável para pouca luz"
                    icon={<Moon className="w-6 h-6" />} 
                    active={theme === 'dark'} 
                    onClick={() => setTheme("dark")} 
                />
                <ThemeModeCard 
                    label="Automático" 
                    description="Segue o sistema operacional"
                    icon={<Laptop className="w-6 h-6" />} 
                    active={theme === 'system'} 
                    onClick={() => setTheme("system")} 
                />
            </div>
        </div>

        {/* SEÇÃO 2: COR DE DESTAQUE */}
        <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Cor de Destaque
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  label="Zinco" 
                  active={themeColor === 'theme-zinc'} 
                  onClick={() => setThemeColor('theme-zinc')} 
                />
                <ThemeColorCard 
                  color="theme-red" 
                  hex="#EA1D2C" 
                  label="Vermelho" 
                  active={themeColor === 'theme-red'} 
                  onClick={() => setThemeColor('theme-red')} 
                />
                <ThemeColorCard 
                  color="theme-orange" 
                  hex="#F97316" 
                  label="Laranja" 
                  active={themeColor === 'theme-orange'} 
                  onClick={() => setThemeColor('theme-orange')} 
                />
                <ThemeColorCard 
                  color="theme-green" 
                  hex="#16A34A" 
                  label="Verde" 
                  active={themeColor === 'theme-green'} 
                  onClick={() => setThemeColor('theme-green')} 
                />
            </div>
        </div>

      </CardContent>
    </Card>
  )
}

// Sub-componente: Cartão de Modo (Claro/Escuro)
function ThemeModeCard({ label, description, icon, active, onClick }: any) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left hover:bg-muted/30",
                active 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "border-muted hover:border-primary/50"
            )}
        >
            <div className={cn("mb-3 p-2 rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {icon}
            </div>
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs text-muted-foreground mt-1">{description}</span>
            
            {active && (
                <div className="absolute top-3 right-3 text-primary">
                    <div className="bg-primary rounded-full p-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                    </div>
                </div>
            )}
        </button>
    )
}

// Sub-componente: Cartão de Cor
function ThemeColorCard({ hex, label, active, onClick }: any) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "group relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-muted/30",
                active ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
            )}
        >
            <div 
                className={cn(
                  "w-10 h-10 rounded-full shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300 border-2 border-background ring-1 ring-border",
                  active ? "scale-110 ring-primary/30" : "group-hover:scale-105"
                )}
                style={{ backgroundColor: hex }} 
            >
              {active && <Check className="text-white w-5 h-5 drop-shadow-md" strokeWidth={3} />}
            </div>
            
            <span className={cn("text-xs font-medium", active ? "text-primary font-bold" : "text-muted-foreground")}>
              {label}
            </span>
        </button>
    )
}
