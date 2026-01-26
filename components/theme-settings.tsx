"use client"

import { useTheme } from "next-themes"
import { useThemeColor } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        
        {/* Escolha de MODO (Claro/Escuro) */}
        <DropdownMenuLabel>Modo de Exibição</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 p-2">
          <Button 
            variant={"outline"} 
            size="sm" 
            onClick={() => setTheme("light")}
            className={cn(theme === "light" && "border-primary bg-primary/10")}
          >
            <Sun className="h-4 w-4 mr-2" />
            Claro
          </Button>
          <Button 
            variant={"outline"} 
            size="sm" 
            onClick={() => setTheme("dark")}
            className={cn(theme === "dark" && "border-primary bg-primary/10")}
          >
            <Moon className="h-4 w-4 mr-2" />
            Escuro
          </Button>
          <Button 
            variant={"outline"} 
            size="sm" 
            onClick={() => setTheme("system")}
            className={cn(theme === "system" && "border-primary bg-primary/10")}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Auto
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Escolha de COR DO SISTEMA */}
        <DropdownMenuLabel>Cor do Sistema</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1 p-2">
          <ColorButton 
            color="theme-zinc" 
            active={themeColor === "theme-zinc"} 
            onClick={() => setThemeColor("theme-zinc")} 
            bg="bg-zinc-900" 
          />
          <ColorButton 
            color="theme-blue" 
            active={themeColor === "theme-blue"} 
            onClick={() => setThemeColor("theme-blue")} 
            bg="bg-blue-600" 
          />
          <ColorButton 
            color="theme-red" 
            active={themeColor === "theme-red"} 
            onClick={() => setThemeColor("theme-red")} 
            bg="bg-red-600" 
          />
          <ColorButton 
            color="theme-orange" 
            active={themeColor === "theme-orange"} 
            onClick={() => setThemeColor("theme-orange")} 
            bg="bg-orange-500" 
          />
          <ColorButton 
            color="theme-green" 
            active={themeColor === "theme-green"} 
            onClick={() => setThemeColor("theme-green")} 
            bg="bg-green-600" 
          />
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColorButton({ color, active, onClick, bg }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all",
        active ? "border-primary ring-2 ring-primary/20 scale-110" : "border-transparent hover:scale-105",
        bg
      )}
    >
      {active && <div className="h-2 w-2 rounded-full bg-white" />}
    </button>
  )
}
