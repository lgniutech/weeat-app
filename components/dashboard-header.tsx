"use client"

import { Bell } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SidebarTrigger } from "@/components/ui/sidebar"

const moduleNames: Record<string, string> = {
  dashboard: "Dashboard",
  pedidos: "Pedidos",
  cardapio: "Cardápio",
  clientes: "Clientes",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
}

interface DashboardHeaderProps {
  activeModule: string
  isStoreOpen: boolean
  onStoreStatusChange: (open: boolean) => void
}

export function DashboardHeader({
  activeModule,
  isStoreOpen,
  onStoreStatusChange,
}: DashboardHeaderProps) {
  return (
    // Removido border-b e adicionado shadow suave
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between bg-background px-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary" />
        
        {/* Removido Separator vertical, apenas o gap já separa bem */}
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground">
                Painel
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/40" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-primary">
                {moduleNames[activeModule] || "Dashboard"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full bg-secondary px-4 py-1.5 transition-colors">
          <span className={`text-sm font-medium ${isStoreOpen ? 'text-primary' : 'text-muted-foreground'}`}>
            {isStoreOpen ? "Loja Aberta" : "Loja Fechada"}
          </span>
          <Switch
            checked={isStoreOpen}
            onCheckedChange={onStoreStatusChange}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-primary"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
          </span>
          <span className="sr-only">Notificações</span>
        </Button>
      </div>
    </header>
  )
}
