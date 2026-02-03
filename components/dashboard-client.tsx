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
import { DollarSign } from "lucide-react"

// Importação dos Módulos (ATUALIZADO)
import { StoreAppearance } from "@/components/modules/store-appearance"
import { MenuManager } from "@/components/modules/menu-manager"
import { OrderManager } from "@/components/modules/order-manager"
import { TablesManager } from "@/components/modules/tables-manager" 
import { OverviewDashboard } from "@/components/modules/overview-dashboard" // <--- NOVO NOME
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
      case 'dashboard':
        // ATUALIZADO: Usando o novo componente
        return <OverviewDashboard store={store} />
        
      case 'orders':
        return <OrderManager store={store} />
        
      case 'tables': 
        return <TablesManager store={store} />
        
      case 'financial':
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] space-y-6 animate-in fade-in zoom-in-95 p-4 text-center">
                <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm mb-2">
                    <DollarSign className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financeiro</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Acompanhe vendas, receitas e relatórios financeiros
                    </p>
                </div>
                <div className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-5 py-2 rounded-full text-sm font-bold border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    Módulo pronto para desenvolvimento
                </div>
            </div>
        )
        
      case 'tema':
        return <AppearanceForm storeId={store?.id} />
        
      case 'store-appearance':
        return <StoreAppearance store={store} />
        
      case 'menu-products':
        return <MenuManager store={store} categories={categories} />
        
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
