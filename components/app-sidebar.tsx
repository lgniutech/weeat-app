"use client"

import * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Banknote,
  Settings,
  LogOut,
  Store,
  ChevronRight,
  MessageCircle,
  QrCode,
  ChefHat,
  BarChart3,
  Ticket,
  Star,
  Palette,
  Image as ImageIcon
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/app/actions/auth"

const navigationItems = [
  {
    title: "Dashboard",
    url: "#",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    title: "Operação",
    icon: ShoppingBag,
    id: "operacao",
    items: [
      { title: "Gestão de Pedidos", url: "#", badge: "12", id: "orders" },
      { title: "Mesas & QR Code", url: "#", icon: QrCode, id: "tables" }, 
      { title: "Tela da Cozinha", url: "#", icon: ChefHat },
    ],
  },
  {
    title: "Cardápio",
    icon: UtensilsCrossed,
    id: "cardapio",
    items: [
      { title: "Produtos & Categorias", url: "#", id: "menu-products" },
      { title: "Estoque", url: "#" },
    ],
  },
  {
    title: "Marketing & Clientes",
    icon: Users,
    id: "marketing",
    items: [
      { title: "Base de Clientes", url: "#" },
      { title: "Automação WhatsApp", url: "#", icon: MessageCircle },
      { title: "Fidelidade & Cupons", url: "#", icon: Ticket, id: "coupons" },
      { title: "Avaliações", url: "#", icon: Star },
    ],
  },
  {
    title: "Financeiro",
    icon: Banknote,
    id: "financeiro",
    items: [
      { title: "Fluxo de Caixa", url: "#" },
      { title: "Relatórios Detalhados", url: "#", icon: BarChart3, id: "financial" }, 
      { title: "Entregadores & Fretes", url: "#" },
    ],
  },
  {
    title: "Configurações",
    icon: Settings,
    id: "configuracoes",
    items: [
      { title: "Dados da Loja", url: "#", id: "store-settings", icon: Store }, 
      { title: "Aparência & Marca", url: "#", id: "store-appearance", icon: ImageIcon },
      { title: "Equipe & Permissões", url: "#", id: "team", icon: Users }, // ID ADICIONADO AQUI
      { title: "Tema (Claro/Escuro)", url: "#", icon: Palette, id: "tema" },
    ],
  },
]

interface AppSidebarProps {
  activeModule: string
  onModuleChange: (moduleId: string) => void
  storeName?: string
  storeLogo?: string
  userName: string
  userEmail: string
}

export function AppSidebar({ 
  activeModule, 
  onModuleChange, 
  storeName = "Minha Loja", 
  storeLogo, 
  userName, 
  userEmail 
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = React.useState<string[]>(["operacao", "configuracoes", "financeiro", "marketing"]) 
  const { state, setOpen } = useSidebar()

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2) : "U"
  }

  return (
    <Sidebar collapsible="icon">
      {state === 'collapsed' && (
        <div 
          className="absolute inset-0 z-50 cursor-pointer bg-transparent"
          onClick={() => setOpen(true)}
          title="Clique para expandir o menu"
        />
      )}

      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {storeLogo ? (
            <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-lg shadow-md shadow-primary/20 border border-border transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <img 
                src={storeLogo} 
                alt="Logo da Loja" 
                className="h-full w-full object-cover" 
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <Store className="h-5 w-5" />
            </div>
          )}
          
          <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-opacity duration-300">
            <span className="text-sm font-semibold text-foreground">weeat</span>
            <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={storeName}>
              {storeName}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 group-data-[collapsible=icon]:p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible
                      defaultOpen={openGroups.includes(item.id)}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className="text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors duration-200 data-[state=open]:text-primary"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                onClick={() => onModuleChange((subItem as any).id || item.id)}
                                className={`cursor-pointer hover:text-primary transition-colors ${
                                  activeModule === ((subItem as any).id || item.id) ? "text-primary font-medium bg-primary/10" : ""
                                }`}
                              >
                                <span>
                                  {subItem.icon && <subItem.icon className="mr-2 h-3 w-3 inline-block" />}
                                  <span className="mr-2 inline-block">{subItem.title}</span>
                                </span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => onModuleChange(item.id)}
                      isActive={activeModule === item.id}
                      tooltip={item.title}
                      className={`relative mb-1 transition-all duration-300 ease-in-out ${
                        activeModule === item.id
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-1"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-2 transition-all hover:bg-muted/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-all group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <AvatarImage src="" alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-foreground truncate" title={userName}>
              {userName}
            </span>
            <span className="text-xs text-muted-foreground truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logoutAction()} 
            className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors group-data-[collapsible=icon]:hidden"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
