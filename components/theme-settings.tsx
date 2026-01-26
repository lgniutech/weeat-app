"use client"

import { useTheme } from "next-themes"
import { useThemeColor } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette, Moon, Sun, Monitor, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSettings() {
  const { setTheme, theme } = useTheme()
  const { themeColor, setThemeColor } = useThemeColor()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        
        {/* Seção de MODO (Claro/Escuro) */}
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Modo
        </DropdownMenuLabel>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTheme("light")}
            className={cn("flex-1 h-8 rounded-md hover:bg-background hover:text-primary transition-all", theme === "light" && "bg-white text-primary shadow-sm")}
          >
            <Sun className="h-4 w-4 mr-1.5" />
            <span className="text-xs font-medium">Claro</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTheme("dark")}
            className={cn("flex-1 h-8 rounded-md hover:bg-background hover:text-primary transition-all", theme === "dark" && "bg-black text-white shadow-sm")}
          >
            <Moon className="h-4 w-4 mr-1.5" />
            <span className="text-xs font-medium">Escuro</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTheme("system")}
            className={cn("h-8 px-2 rounded-md hover:bg-background transition-all", theme === "system" && "bg-background shadow-sm")}
            title="Automático"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Seção de COR DE DESTAQUE */}
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 mt-2">
            Cor do Painel
        </DropdownMenuLabel>
        
        <div className="grid grid-cols-5 gap-2 px-1 pb-2">
           <ColorOption 
             color="theme-blue" 
             hex="#02B5FF" 
             label="Azul" 
             active={themeColor === "theme-blue"} 
             onClick={() => setThemeColor("theme-blue")} 
           />
           <ColorOption 
             color="theme-zinc" 
             hex="#18181B" 
             label="Zinco" 
             active={themeColor === "theme-zinc"} 
             onClick={() => setThemeColor("theme-zinc")} 
           />
           <ColorOption 
             color="theme-red" 
             hex="#EA1D2C" 
             label="Red" 
             active={themeColor === "theme-red"} 
             onClick={() => setThemeColor("theme-red")} 
           />
           <ColorOption 
             color="theme-orange" 
             hex="#F97316" 
             label="Orange" 
             active={themeColor === "theme-orange"} 
             onClick={() => setThemeColor("theme-orange")} 
           />
           <ColorOption 
             color="theme-green" 
             hex="#16A34A" 
             label="Green" 
             active={themeColor === "theme-green"} 
             onClick={() => setThemeColor("theme-green")} 
           />
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColorOption({ hex, active, onClick, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "group relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 border-2",
                active ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-110 hover:border-muted-foreground/30"
            )}
            title={label}
        >
            <div 
                className="w-full h-full rounded-full border-2 border-white dark:border-zinc-900" 
                style={{ backgroundColor: hex }}
            />
            {active && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white drop-shadow-md" strokeWidth={3} />
                </div>
            )}
        </button>
    )
}
