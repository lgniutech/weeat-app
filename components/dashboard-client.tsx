"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { ThemeSettings } from "@/components/theme-settings"
import { StoreSetupModal } from "@/components/modals/store-setup-modal"
import { StoreSettingsModal } from "@/components/modals/store-settings-modal"

// IMPORTANTE: Importar os novos módulos que vamos criar
import { StoreAppearance } from "@/components/modules/store-appearance"
import { MenuManager } from "@/components/modules/menu-manager"

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

  useEffect(() => {
    // Se clicar em "Dados da Loja", abre o modal em vez de trocar a tela
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      setActiveModule('dashboard') // Volta pro dashboard por baixo
    }
  }, [activeModule])

  const hasStore = !!store

  // Função simples para renderizar o conteúdo baseado no módulo ativo
  const renderContent = () => {
    switch (activeModule) {
      case 'tema':
        return <ThemeSettings />
      case 'store-appearance':
        return <StoreAppearance store={store} />
      case 'menu-products':
        return <MenuManager store={store} categories={categories} />
      case 'dashboard':
        return <EmptyState moduleId="Dashboard (Em Breve)" />
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
        onModuleChange={setActiveModule}
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
        />
        
        <main className="flex flex-1 flex-col bg-background p-4 overflow-y-auto">
          {renderContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
