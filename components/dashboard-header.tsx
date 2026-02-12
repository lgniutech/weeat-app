"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ExternalLink, Store } from "lucide-react"
import Link from "next/link"

interface DashboardHeaderProps {
  activeModule: string
  isStoreOpen: boolean
  onStoreStatusChange: (isOpen: boolean) => void
  storeName?: string
  storeSlug?: string
}

// Mapa para traduzir os IDs dos módulos para títulos amigáveis
const moduleNames: Record<string, string> = {
  dashboard: "Visão Geral",
  orders: "Gestão de Pedidos",
  "menu-products": "Produtos & Categorias",
  "store-appearance": "Aparência & Marca",
  "store-settings": "Dados da Loja",
  financeiro: "Financeiro",
  tema: "Aparência do Painel"
}

export function DashboardHeader({ 
  activeModule, 
  // Props de status da loja mantidas na interface para compatibilidade, 
  // mas não usadas visualmente por enquanto (Feature Futura)
  storeName,
  storeSlug 
}: DashboardHeaderProps) {
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      {/* Lado Esquerdo: Toggle da Sidebar e Título da Página */}
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 font-medium">
                {moduleNames[activeModule] || activeModule}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Lado Direito: Botão "Ver Loja" */}
      {storeSlug && (
        <div className="flex items-center gap-2">
            {/* Versão Desktop */}
            <Button variant="outline" size="sm" className="hidden md:flex gap-2 text-muted-foreground hover:text-primary border-dashed" asChild>
                <Link href={`/${storeSlug}`} target="_blank" title="Abrir cardápio em nova aba">
                    <Store className="w-4 h-4" />
                    Ver Loja Online
                    <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </Link>
            </Button>
            
            {/* Versão Mobile (Só ícone) */}
            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" asChild>
                <Link href={`/${storeSlug}`} target="_blank">
                    <ExternalLink className="w-4 h-4" />
                </Link>
            </Button>
        </div>
      )}
    </header>
  )
}
