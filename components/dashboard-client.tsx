"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmptyState } from "@/components/empty-state"
import { ThemeSettings } from "@/components/theme-settings"
import { StoreSetupModal } from "@/components/modals/store-setup-modal"

interface DashboardClientProps {
  hasStore: boolean
  storeName?: string
  userName: string
  userEmail: string
}

export default function DashboardClient({ 
  hasStore, 
  storeName, 
  userName, 
  userEmail 
}: DashboardClientProps) {
  // Estado para controlar qual tela está ativa no dashboard
  const [activeModule, setActiveModule] = useState("dashboard")
  
  // Estado para controlar se a loja está aberta ou fechada
  const [isStoreOpen, setIsStoreOpen] = useState(true)

  return (
    <SidebarProvider>
      {/* Se o usuário não tiver loja, este modal aparece e bloqueia a tela até ele criar */}
      {!hasStore && <StoreSetupModal />}
      
      <AppSidebar 
        activeModule={activeModule} 
        onModuleChange={setActiveModule}
        storeName={storeName}
        userName={userName}
        userEmail={userEmail}
      />
      
      <SidebarInset>
        <DashboardHeader
          activeModule={activeModule}
          isStoreOpen={isStoreOpen}
          onStoreStatusChange={setIsStoreOpen}
          storeName={storeName}
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
