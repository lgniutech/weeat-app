"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation" // IMPORTADO
import { useTheme } from "next-themes"
import { useThemeColor } from "@/components/theme-provider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { StoreSetupModal } from "@/components/modals/store-setup-modal"
import { StoreSettingsModal } from "@/components/modals/store-settings-modal"

// Importação dos Módulos
import { StoreAppearance } from "@/components/modules/store-appearance"
import { MenuManager } from "@/components/modules/menu-manager"
import { AppearanceForm } from "@/components/settings/appearance-form"

interface DashboardClientProps {
  store: any
  categories: any[]
  userName: string
  userEmail: string
}

export default function DashboardClient({ 
  store,
  categories,
  userName, 
  userEmail 
}: DashboardClientProps) {
  // Hooks de Navegação (Agora controlamos via URL)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // 1. O módulo ativo vem da URL (?tab=...) ou padrão 'dashboard'
  const activeModule = searchParams.get("tab") || "dashboard"

  // 2. Função para trocar de módulo (Atualiza a URL)
  const handleModuleChange = (moduleId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", moduleId)
    
    // push: adiciona no histórico (botão voltar funciona)
    // scroll: false evita que a página pule para o topo
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Hooks de Tema
  const { setTheme } = useTheme()
  const { setThemeColor } = useThemeColor()
  
  // Controle para evitar "Piscada" do tema (Lag)
  const isThemeInitialized = useRef(false)

  // Sincronizar Tema do Banco (Apenas uma vez na inicialização)
  useEffect(() => {
    if (store && !isThemeInitialized.current) {
      if (store.theme_mode) setTheme(store.theme_mode)
      if (store.theme_color) setThemeColor(store.theme_color)
      isThemeInitialized.current = true
    }
  }, [store, setTheme, setThemeColor])

  // Interceptar clique em "Dados da Loja" para abrir Modal
  useEffect(() => {
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      // Volta a URL para dashboard para não ficar presa em 'store-settings'
      // mas mantém o modal aberto
      handleModuleChange('dashboard')
    }
  }, [activeModule])

  const hasStore = !!store

  const renderContent = () => {
    switch (activeModule) {
      case 'tema':
        return <AppearanceForm storeId={store?.id} />
      case 'store-appearance':
        return <StoreAppearance store={store} />
      case 'menu-products':
        return <MenuManager store={store} categories={categories} />
      case 'dashboard':
        return <EmptyState moduleId="Dashboard (Visão Geral em Breve)" />
      default:
        return <EmptyState moduleId={activeModule} />
    }
  }

  return (
    <SidebarProvider>
      {!hasStore && <StoreSetupModal />}
      
      {hasStore && (
        <StoreSettingsModal 
          store={store} 
          userName={userName} 
          isOpen={isSettingsModalOpen} 
          onOpenChange={setIsSettingsModalOpen} 
        />
      )}
      
      <AppSidebar 
        activeModule={activeModule} 
        onModuleChange={handleModuleChange} // Passamos a nova função de URL
        storeName={store?.name}
        storeLogo={store?.logo_url}
        userName={userName}
        userEmail={userEmail}
      />
      
      <SidebarInset>
        <DashboardHeader
          activeModule={activeModule}
          isStoreOpen={isStoreOpen}
          onStoreStatusChange={setIsStoreOpen}
          storeName={store?.name}
          storeSlug={store?.slug}
        />
        
        <main className="flex flex-1 flex-col bg-background p-4 overflow-y-auto">
          {renderContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
