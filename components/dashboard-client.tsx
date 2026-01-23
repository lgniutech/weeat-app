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
  store: any
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
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  useEffect(() => {
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      setActiveModule('dashboard')
    }
  }, [activeModule])

  const hasStore = !!store

  return (
    <SidebarProvider>
      {/* Setup Inicial */}
      {!hasStore && <StoreSetupModal />}
      
      {/* Edição (Pop-up) - Agora recebe userName */}
      {hasStore && (
        <StoreSettingsModal 
          store={store} 
          userName={userName} // Passando o nome atual
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
