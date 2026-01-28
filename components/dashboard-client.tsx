"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
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
import { OrderManager } from "@/components/modules/order-manager" // <--- IMPORT NOVO
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeModule = searchParams.get("tab") || "dashboard"

  const handleModuleChange = (moduleId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", moduleId)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  const { setTheme } = useTheme()
  const { setThemeColor } = useThemeColor()
  const isThemeInitialized = useRef(false)

  useEffect(() => {
    if (store && !isThemeInitialized.current) {
      if (store.theme_mode) setTheme(store.theme_mode)
      if (store.theme_color) setThemeColor(store.theme_color)
      isThemeInitialized.current = true
    }
  }, [store, setTheme, setThemeColor])

  useEffect(() => {
    if (activeModule === 'store-settings') {
      setIsSettingsModalOpen(true)
      handleModuleChange('dashboard')
    }
  }, [activeModule])

  const hasStore = !!store

  const renderContent = () => {
    switch (activeModule) {
      case 'orders': // <--- CASE NOVO
        return <OrderManager store={store} />
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
        onModuleChange={handleModuleChange} 
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
        
        <main className="flex flex-1 flex-col bg-background p-4 overflow-y-auto overflow-x-hidden">
          {renderContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
