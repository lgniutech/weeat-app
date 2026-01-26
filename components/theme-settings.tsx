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
import { Palette, Moon, Sun, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSettings() {
  const { setTheme, theme } = useTheme()
  const { themeColor, setThemeColor } = useThemeColor()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9">
          <Palette className="h-[1.2rem] w-[1.2rem] text-primary transition-colors" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2">
        
        {/* Modo Claro/Escuro */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Modo</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme("light")}
            className={cn("justify-start px-2", theme === "light" && "border-primary bg-primary/10")}
          >
            <Sun className="h-4 w-4 mr-2" />
            Claro
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme("dark")}
            className={cn("justify-start px-2", theme === "dark" && "border-primary bg-primary/10")}
          >
            <Moon className="h-4 w-4 mr-2" />
            Escuro
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme("system")}
            className={cn("justify-start px-2", theme === "system" && "border-primary bg-primary/10")}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Auto
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Cor de Destaque */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground mt-2">Cor do Painel</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-2 pt-1 pb-2">
          <ColorBtn color="theme-blue" bg="bg-[#02B5FF]" active={themeColor === "theme-blue"} onClick={() => setThemeColor("theme-blue")} label="Azul" />
          <ColorBtn color="theme-zinc" bg="bg-zinc-800" active={themeColor === "theme-zinc"} onClick={() => setThemeColor("theme-zinc")} label="Zinco" />
          <ColorBtn color="theme-red" bg="bg-red-600" active={themeColor === "theme-red"} onClick={() => setThemeColor("theme-red")} label="Vermelho" />
          <ColorBtn color="theme-orange" bg="bg-orange-500" active={themeColor === "theme-orange"} onClick={() => setThemeColor("theme-orange")} label="Laranja" />
          <ColorBtn color="theme-green" bg="bg-green-600" active={themeColor === "theme-green"} onClick={() => setThemeColor("theme-green")} label="Verde" />
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColorBtn({ bg, active, onClick, label }: any) {
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onClick}>
      <div className={cn(
        "h-8 w-8 rounded-full shadow-sm flex items-center justify-center transition-all",
        bg,
        active ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
      )}>
        {active && <div className="h-2.5 w-2.5 bg-white rounded-full shadow-sm" />}
      </div>
      {/* <span className="text-[10px] text-muted-foreground group-hover:text-foreground">{label}</span> */}
    </div>
  )
}
