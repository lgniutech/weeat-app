"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getKitchenOrdersAction, advanceKitchenStatusAction } from "@/app/actions/kitchen"
import { logoutStaffAction } from "@/app/actions/staff"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  Utensils, 
  AlertTriangle,
  Flame,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- COMPONENTE: TIMER INTELIGENTE ---
function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start)
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const minutes = Math.floor(elapsedMs / 60000)
  const seconds = Math.floor((elapsedMs % 60000) / 1000)

  // Lógica de Cores (SLA)
  // < 10 min: Verde | 10-20 min: Amarelo | > 20 min: Vermelho
  let colorClass = "text-green-600 bg-green-100 border-green-200"
  if (minutes >= 10) colorClass = "text-yellow-600 bg-yellow-100 border-yellow-200"
  if (minutes >= 20) colorClass = "text-red-600 bg-red-100 border-red-200"

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border font-bold font-mono text-sm", colorClass)}>
      <Clock className="w-4 h-4" />
      <span>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// --- PÁGINA PRINCIPAL DA COZINHA (KDS) ---
export default function KitchenPage({ params }: { params: { slug: string } }) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // 1. CARREGAR PEDIDOS INICIAIS
  const fetchOrders = async () => {
    // Precisamos do StoreID. Em um app real, pegaria do contexto/sessão.
    // Aqui, vamos inferir que o server action resolve isso ou passamos via props se disponível.
    // Nota: O getKitchenOrdersAction pede storeId. 
    // Como estamos no client, vamos buscar o storeId pelo slug primeiro ou assumir que a sessão server-side resolve.
    // Para simplificar e seguir o padrão "AnotaAí", vamos buscar via action wrapper ou passar um ID fixo se já tivermos na sessão.
    
    // TRUQUE: Vamos fazer um "refresh" chamando a action.
    // A action precisa do storeId. Vamos pegar do sessionStorage ou cookie se disponível, 
    // mas o ideal é que o componente receba o ID.
    // Para manter o código "copiar e colar" funcionando, vamos assumir que o usuário
    // logou e o cookie de sessão está lá. Vamos usar um "truque" para pegar o ID da loja 
    // (normalmente viria de um Layout ou Contexto).
    
    // Ajuste: Vamos buscar os pedidos passando o slug para uma action auxiliar ou
    // assumindo que a action de server já pega da sessão.
    // Vamos usar a action existente, mas ela pede storeId.
    // Solução: Vamos buscar o storeId pelo slug via Supabase Client rapidinho.
    
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('slug', params.slug).single()
      if (store) {
        const data = await getKitchenOrdersAction(store.id)
        setOrders(data)
        
        // Inscrever no Realtime
        const channel = supabase
          .channel('kitchen_orders')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
            () => {
               // Recarrega tudo quando houver mudança (simples e eficaz)
               getKitchenOrdersAction(store.id).then(setOrders)
            }
          )
          .subscribe()

        return () => supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error("Erro ao carregar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [params.slug])

  // 2. AÇÃO DE AVANÇAR STATUS
  const handleAdvance = (orderId: string, currentStatus: string) => {
    startTransition(async () => {
      const result = await advanceKitchenStatusAction(orderId, currentStatus)
      if (result.success) {
        toast({ title: "Status atualizado!", className: "bg-green-600 text-white border-none" })
        // O Realtime vai atualizar a lista, mas podemos otimizar:
        // setOrders(prev => prev.filter(o => o.id !== orderId)) // Otimista se for sair da tela
        // Mas como muda de coluna, melhor esperar o refresh ou mover localmente.
        // Vamos forçar um refresh manual para garantir a consistência imediata
        const { data: store } = await supabase.from('stores').select('id').eq('slug', params.slug).single()
        if (store) {
           const data = await getKitchenOrdersAction(store.id)
           setOrders(data)
        }
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" })
      }
    })
  }

  // 3. SAIR
  const handleLogout = async () => {
    await logoutStaffAction()
    router.push(`/${params.slug}/login`)
  }

  // SEPARAÇÃO DAS COLUNAS
  const todoOrders = orders.filter(o => o.status === 'aceito')
  const cookingOrders = orders.filter(o => o.status === 'preparando')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <ChefHat className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">Cozinha KDS</h1>
            <p className="text-xs text-muted-foreground mt-1">Gerenciamento de Pedidos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Resumo Rápido */}
           <div className="hidden md:flex gap-4 mr-4">
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground uppercase font-bold">Na Fila</span>
               <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{todoOrders.length}</span>
             </div>
             <div className="w-px h-8 bg-slate-200"></div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground uppercase font-bold">No Fogo</span>
               <span className="text-xl font-bold text-orange-600">{cookingOrders.length}</span>
             </div>
           </div>
           
           <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
             <LogOut className="w-4 h-4" />
             Sair
           </Button>
        </div>
      </header>

      {/* KANBAN BOARD */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* COLUNA 1: A FAZER (Fila) */}
        <section className="flex-1 flex flex-col min-w-[350px] bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <header className="p-4 border-b bg-white/50 dark:bg-slate-900/50 rounded-t-xl flex items-center justify-between backdrop-blur-sm sticky top-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200">A Fazer (Fila)</h2>
            </div>
            <Badge variant="secondary" className="bg-slate-200 text-slate-700">{todoOrders.length}</Badge>
          </header>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {todoOrders.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <Utensils className="w-12 h-12 mb-2" />
                  <p>Cozinha limpa!</p>
                </div>
              )}
              {todoOrders.map((order) => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={() => handleAdvance(order.id, 'aceito')}
                  actionLabel="Iniciar Preparo"
                  actionIcon={<Flame className="w-4 h-4 mr-2" />}
                  variant="default"
                />
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* COLUNA 2: NO FOGO (Preparando) */}
        <section className="flex-1 flex flex-col min-w-[350px] bg-orange-50/50 dark:bg-orange-950/10 rounded-xl border border-orange-200 dark:border-orange-900">
          <header className="p-4 border-b bg-orange-100/50 dark:bg-orange-900/20 rounded-t-xl flex items-center justify-between backdrop-blur-sm sticky top-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="font-bold text-lg text-orange-900 dark:text-orange-100">No Fogo</h2>
            </div>
            <Badge className="bg-orange-500 hover:bg-orange-600 border-none">{cookingOrders.length}</Badge>
          </header>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {cookingOrders.length === 0 && (
                 <div className="h-40 flex flex-col items-center justify-center text-orange-800/40 dark:text-orange-200/40">
                   <Flame className="w-12 h-12 mb-2" />
                   <p>Nenhum pedido no fogo.</p>
                 </div>
              )}
              {cookingOrders.map((order) => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={() => handleAdvance(order.id, 'preparando')}
                  actionLabel="Pronto para Servir"
                  actionIcon={<CheckCircle2 className="w-4 h-4 mr-2" />}
                  variant="cooking"
                />
              ))}
            </div>
          </ScrollArea>
        </section>

      </main>
    </div>
  )
}

// --- SUB-COMPONENTE: CARD DO PEDIDO ---
function KitchenOrderCard({ order, onAction, actionLabel, actionIcon, variant }: any) {
  return (
    <Card className={cn(
      "border-l-4 shadow-sm hover:shadow-md transition-all duration-200",
      variant === 'cooking' ? "border-l-orange-500 border-orange-100 dark:border-orange-900 bg-white dark:bg-slate-900" : "border-l-slate-400"
    )}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div>
          {/* NÚMERO DA MESA GIGANTE */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {order.table_number || "BALCÃO"}
            </span>
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">
              {order.customer_name}
            </span>
          </div>
          {/* TIPO: MESA OU ENTREGA */}
          <div className="mt-1">
             <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase tracking-wide text-muted-foreground">
               {order.delivery_type === 'mesa' ? 'No Salão' : order.delivery_type}
             </Badge>
          </div>
        </div>
        
        {/* TIMER */}
        <OrderTimer createdAt={order.created_at} />
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="my-2 h-px bg-slate-100 dark:bg-slate-800" />
        <ul className="space-y-3">
          {order.order_items.map((item: any) => (
            <li key={item.id} className="text-sm">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                   <span className="font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-900 dark:text-slate-100 h-fit">
                     {item.quantity}x
                   </span>
                   <span className="font-medium text-slate-700 dark:text-slate-300 leading-tight">
                     {item.name}
                   </span>
                </div>
              </div>
              
              {/* OBSERVAÇÕES E ADICIONAIS */}
              <div className="pl-8 mt-1 space-y-1">
                {/* Ingredientes Removidos (Vermelho) */}
                {item.removed_ingredients && JSON.parse(item.removed_ingredients).length > 0 && (
                   <div className="flex flex-wrap gap-1">
                     {JSON.parse(item.removed_ingredients).map((ing: string, i: number) => (
                       <span key={i} className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-1 rounded border border-red-100 dark:border-red-900 uppercase">
                         SEM {ing}
                       </span>
                     ))}
                   </div>
                )}
                
                {/* Adicionais (Azul/Verde) */}
                {item.selected_addons && JSON.parse(item.selected_addons).length > 0 && (
                   <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                     + {JSON.parse(item.selected_addons).map((a: any) => a.name).join(", ")}
                   </div>
                )}

                {/* Observação Livre (Amarelo) */}
                {item.observation && (
                  <div className="flex items-start gap-1 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900 rounded text-yellow-800 dark:text-yellow-200 text-xs font-medium mt-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="uppercase">{item.observation}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
        <Button 
          className={cn(
            "w-full font-semibold shadow-sm",
            variant === 'cooking' 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
          )}
          onClick={onAction}
        >
          {actionIcon}
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
