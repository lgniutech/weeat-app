import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Banknote, Settings } from "lucide-react"

const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  pedidos: ShoppingBag,
  cardapio: UtensilsCrossed,
  clientes: Users,
  financeiro: Banknote,
  configuracoes: Settings,
}

const moduleNames: Record<string, string> = {
  dashboard: "Dashboard",
  pedidos: "Pedidos",
  cardapio: "Cardápio",
  clientes: "Clientes",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
}

const moduleDescriptions: Record<string, string> = {
  dashboard: "Visualize métricas e indicadores do seu negócio em tempo real",
  pedidos: "Gerencie pedidos em tempo real e acompanhe o status de entregas",
  cardapio: "Adicione, edite e organize seus produtos e categorias",
  clientes: "Conheça seus clientes e construa relacionamentos duradouros",
  financeiro: "Acompanhe vendas, receitas e relatórios financeiros",
  configuracoes: "Personalize sua loja, horários e áreas de entrega",
}

interface EmptyStateProps {
  moduleId: string
}

export function EmptyState({ moduleId }: EmptyStateProps) {
  const Icon = moduleIcons[moduleId] || LayoutDashboard
  const name = moduleNames[moduleId] || "Módulo"
  const description = moduleDescriptions[moduleId] || "Pronto para desenvolvimento"

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          {name}
        </h2>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          {description}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Módulo pronto para desenvolvimento
        </div>
      </div>
    </div>
  )
}
