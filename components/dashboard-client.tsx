"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { ThemeSettings } from "@/components/theme-settings"
import { StoreSetupModal } from "@/components/modals/store-setup-modal"
import { StoreSettingsModal } from "@/components/modals/store-settings-modal"

interface DashboardClientProps {
  store: any // Agora aceita o objeto completo
  userName: string
  userEmail: string
}

export default function DashboardClient({ 
  store,
  userName, 
  userEmail 
}: DashboardClientProps) {
  const [activeModule, setActiveModule] = useState("dashboard")
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  
  // Estado para controlar o Modal de Configurações
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Efeito: Se o usuário clicar em "Dados da Loja" (store-settings), abre o modal
  // e mantém o módulo visual anterior (ou dashboard) para não ficar tela branca
  useEffect(() => {
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      setActiveModule('dashboard') // Volta o foco visual para o dashboard
    }
  }, [activeModule])

  const hasStore = !!store

  return (
    <SidebarProvider>
      {/* Modais */}
      {!hasStore && <StoreSetupModal />}
      
      {hasStore && (
        <StoreSettingsModal 
          store={store} 
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
        
        <main className="flex flex-1 flex-col bg-background p-4">
          {activeModule === 'tema' ? (
            <ThemeSettings />
          ) : (
            <EmptyState moduleId={activeModule} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
