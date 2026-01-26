"use client"

import { useState, useEffect } from "react"
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
  const [activeModule, setActiveModule] = useState("dashboard")
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Hooks de Tema para Sincronização
  const { setTheme } = useTheme()
  const { setThemeColor } = useThemeColor()

  // 1. Sincronizar Tema do Banco de Dados ao Carregar
  useEffect(() => {
    if (store) {
      if (store.theme_mode) setTheme(store.theme_mode)
      if (store.theme_color) setThemeColor(store.theme_color)
    }
  }, [store, setTheme, setThemeColor])

  // 2. Interceptar clique em "Dados da Loja" e abrir o modal
  useEffect(() => {
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      setActiveModule('dashboard') // Mantém o usuário na tela atual ao fundo
    }
  }, [activeModule])

  const hasStore = !!store

  // Função que decide qual componente renderizar na área principal
  const renderContent = () => {
    switch (activeModule) {
      case 'tema':
        // Passamos o ID da loja para salvar as alterações
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
      {/* 1. Modal de Setup Inicial (Se não tiver loja) */}
      {!hasStore && <StoreSetupModal />}
      
      {/* 2. Modal de Configurações da Loja (Edição) */}
      {hasStore && (
        <StoreSettingsModal 
          store={store} 
          userName={userName} 
          isOpen={isSettingsModalOpen} 
          onOpenChange={setIsSettingsModalOpen} 
        />
      )}
      
      {/* 3. Barra Lateral */}
      <AppSidebar 
        activeModule={activeModule} 
        onModuleChange={setActiveModule}
        storeName={store?.name}
        storeLogo={store?.logo_url}
        userName={userName}
        userEmail={userEmail}
      />
      
      {/* 4. Área Principal */}
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
