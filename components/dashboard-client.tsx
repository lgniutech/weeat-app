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
  storeLogo?: string // Nova prop
  userName: string
  userEmail: string
}

export default function DashboardClient({ 
  hasStore, 
  storeName, 
  storeLogo,
  userName, 
  userEmail 
}: DashboardClientProps) {
  const [activeModule, setActiveModule] = useState("dashboard")
  const [isStoreOpen, setIsStoreOpen] = useState(true)

  return (
    <SidebarProvider>
      {!hasStore && <StoreSetupModal />}
      
      <AppSidebar 
        activeModule={activeModule} 
        onModuleChange={setActiveModule}
        storeName={storeName}
        storeLogo={storeLogo} // Passando para a Sidebar
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
