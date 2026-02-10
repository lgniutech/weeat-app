"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes" 
import { getKitchenOrdersAction, advanceKitchenStatusAction, advanceItemStatusAction } from "@/app/actions/kitchen"
import { logoutStaffAction } from "@/app/actions/staff"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  Utensils, 
  AlertTriangle,
  Play,
  ArrowRight,
  Sun,
  Moon,
  Layers,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- TIMER ---
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
  
  let colorClass = "text-green-600 bg-green-50 border-green-200"
  if (minutes >= 15) colorClass = "text-yellow-600 bg-yellow-50 border-yellow-200"
  if (minutes >= 30) colorClass = "text-red-600 bg-red-50 border-red-200 animate-pulse"

  return (
    <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono border", colorClass)}>
      <Clock className="w-3 h-3" />
      <span>{minutes}m</span>
    </div>
  )
}

function KitchenContent({ params }: { params: { slug: string } }) {
  const [orders, setOrders] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'orders' | 'items'>('orders') // ESTADO DO MODO DE VISÃO
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const fetchOrders = async () => {
    const supabase = require("@/lib/supabase/client").createClient()
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('slug', params.slug).single()
      if (store) {
        const data = await getKitchenOrdersAction(store.id)
        setOrders(data)
        
        const channel = supabase
          .channel('kitchen_orders')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
            () => { getKitchenOrdersAction(store.id).then(setOrders) }
          )
          .subscribe()

        return () => supabase.removeChannel(channel)
      }
    } catch (error) { console.error(error) }
  }

  useEffect(() => { fetchOrders() }, [params.slug])

  const handleLogout = async () => {
    await logoutStaffAction()
    router.push(`/${params.slug}/login`)
  }

  // --- AÇÃO: PEDIDO COMPLETO ---
  const handleAdvanceOrder = (orderId: string, currentStatus: string) => {
    // Otimismo na UI
    if (currentStatus === 'preparando') {
        setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparando' } : o));
    }

    startTransition(async () => {
      const result = await advanceKitchenStatusAction(orderId, currentStatus)
      if (result.success && currentStatus === 'preparando') {
        toast({ title: "Pedido Pronto!", description: "Garçom notificado.", className: "bg-green-600 text-white" })
      }
    })
  }

  // --- AÇÃO: ITEM INDIVIDUAL ---
  const handleAdvanceItem = (itemId: string, orderId: string) => {
      // Remove visualmente o item da lista imediatamente
      setOrders(prev => prev.map(o => ({
          ...o,
          order_items: o.order_items.filter((i: any) => i.id !== itemId)
      })).filter(o => o.order_items.length > 0)) // Remove pedido se ficar vazio

      startTransition(async () => {
          const res = await advanceItemStatusAction(itemId, orderId)
          if (res.success) {
              if (res.orderFinished) toast({ title: "Pedido Completo!", description: "Todos os itens prontos.", className: "bg-green-600 text-white" })
          } else {
              fetchOrders() // Reverte se der erro
          }
      })
  }

  // Lógica de Filtro para Colunas (Modo Pedidos)
  const todoOrders = orders.filter(o => o.status === 'aceito')
  const cookingOrders = orders.filter(o => o.status === 'preparando')

  // Lógica de "Flatten" (Modo Itens) - Transforma lista de pedidos em lista de itens
  const allItems = orders.flatMap(order => 
    order.order_items
        .filter((item: any) => item.status !== 'concluido') // Esconde itens já feitos
        .map((item: any) => ({
            ...item,
            _order: order // Mantém referência ao pedido pai para mostrar mesa/tempo
        }))
  ).sort((a, b) => new Date(a._order.created_at).getTime() - new Date(b._order.created_at).getTime())

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 text-white p-2 rounded-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-none">Cozinha</h1>
            <p className="text-xs text-muted-foreground mt-1">
                {viewMode === 'orders' ? 'Visão por Pedido' : 'Visão por Item (Linha de Produção)'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            
            {/* SWITCH DE MODO DE VISÃO */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Button 
                    size="sm" 
                    variant={viewMode === 'orders' ? 'default' : 'ghost'} 
                    onClick={() => setViewMode('orders')}
                    className="h-8 text-xs gap-2"
                >
                    <Layers className="w-3 h-3" /> Pedidos
                </Button>
                <Button 
                    size="sm" 
                    variant={viewMode === 'items' ? 'default' : 'ghost'} 
                    onClick={() => setViewMode('items')}
                    className="h-8 text-xs gap-2"
                >
                    <List className="w-3 h-3" /> Itens
                </Button>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-400 hover:text-red-600 hover:bg-red-50">
               <LogOut className="w-5 h-5" />
            </Button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-6 overflow-hidden">
        
        {/* MODO 1: VISÃO DE PEDIDOS (KANBAN) */}
        {viewMode === 'orders' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
                {/* Coluna A Fazer */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                        <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> A Fazer
                        </h2>
                        <Badge variant="secondary">{todoOrders.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {todoOrders.length === 0 && <EmptyState label="Sem novos pedidos" />}
                            {todoOrders.map((order) => (
                                <OrderCard key={order.id} order={order} onAction={() => handleAdvanceOrder(order.id, 'aceito')} btnText="Iniciar Preparo" btnColor="bg-blue-600 hover:bg-blue-700" icon={<Play className="w-4 h-4 mr-2" />} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                
                {/* Seta */}
                <div className="hidden md:flex items-center text-slate-300"><ArrowRight className="w-8 h-8 opacity-20" /></div>

                {/* Coluna Preparando */}
                <div className="flex-1 flex flex-col bg-orange-50/30 dark:bg-orange-950/10 rounded-xl border border-orange-200 dark:border-orange-900 shadow-sm h-full">
                    <div className="p-4 border-b border-orange-100 dark:border-orange-900 flex justify-between items-center bg-orange-100/50 dark:bg-orange-900/20 rounded-t-xl">
                        <h2 className="font-bold text-lg text-orange-800 dark:text-orange-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Preparando
                        </h2>
                        <Badge className="bg-orange-500 hover:bg-orange-600 border-none">{cookingOrders.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                             {cookingOrders.length === 0 && <EmptyState label="Nenhum prato no fogo" />}
                             {cookingOrders.map((order) => (
                                <OrderCard key={order.id} order={order} isCooking onAction={() => handleAdvanceOrder(order.id, 'preparando')} btnText="PRONTO (Finalizar)" btnColor="bg-green-600 hover:bg-green-700" icon={<CheckCircle2 className="w-4 h-4 mr-2" />} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        )}

        {/* MODO 2: VISÃO DE ITENS INDIVIDUAIS */}
        {viewMode === 'items' && (
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allItems.length === 0 && (
                         <div className="col-span-full py-20 text-center opacity-50">
                             <Utensils className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                             <h3 className="text-xl font-bold">Cozinha Zerada!</h3>
                             <p>Não há itens pendentes para preparo.</p>
                         </div>
                    )}
                    
                    {allItems.map((item: any, idx: number) => (
                        <Card key={`${item.id}-${idx}`} className="overflow-hidden border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all animate-in zoom-in-50 duration-300">
                             <div className="p-4 flex flex-col gap-3">
                                 {/* Header do Item */}
                                 <div className="flex justify-between items-start">
                                     <div>
                                         <Badge variant="outline" className="mb-1 text-[10px] bg-slate-50 dark:bg-slate-800">
                                             {item._order.delivery_type === 'mesa' ? `MESA ${item._order.table_number}` : 'DELIVERY'}
                                         </Badge>
                                         <div className="text-xs text-muted-foreground font-bold">#{item._order.id.slice(0,4)} • {item._order.customer_name.split(' ')[0]}</div>
                                     </div>
                                     <OrderTimer createdAt={item._order.created_at} />
                                 </div>
                                 
                                 {/* Nome do Item Gigante */}
                                 <div>
                                     <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{item.quantity}x</span>
                                        <span className="text-xl font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.name}</span>
                                     </div>
                                     
                                     {/* Modificadores */}
                                     <div className="mt-2 space-y-1">
                                        {item.removed_ingredients && JSON.parse(item.removed_ingredients).length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {JSON.parse(item.removed_ingredients).map((ing: string, i: number) => (
                                                <span key={i} className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded uppercase">
                                                    SEM {ing}
                                                </span>
                                                ))}
                                            </div>
                                        )}
                                        {item.observation && (
                                            <div className="flex items-start gap-1 p-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-100 dark:border-yellow-900/50">
                                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                                <span className="uppercase font-bold">{item.observation}</span>
                                            </div>
                                        )}
                                     </div>
                                 </div>

                                 <Button 
                                    className="w-full mt-2 font-bold bg-slate-900 hover:bg-green-600 text-white transition-colors"
                                    onClick={() => handleAdvanceItem(item.id, item._order.id)}
                                 >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    MARCAR PRONTO
                                 </Button>
                             </div>
                        </Card>
                    ))}
                </div>
            </div>
        )}

      </main>
    </div>
  )
}

// --- SUB-COMPONENTES VISUAIS ---

function OrderCard({ order, onAction, btnText, btnColor, icon, isCooking }: any) {
  return (
    <Card className={cn("border shadow-sm overflow-hidden transition-all", isCooking ? "border-orange-200 dark:border-orange-900 ring-1 ring-orange-100 dark:ring-orange-900" : "border-slate-200")}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              {order.delivery_type === 'mesa' ? 'Mesa' : 'Pedido'}
            </span>
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {order.table_number || "?"}
            </span>
          </div>
          <OrderTimer createdAt={order.created_at} />
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-3" />
        <div className="space-y-3">
          {order.order_items.filter((i:any) => i.status !== 'concluido').map((item: any) => (
            <div key={item.id} className="text-sm">
              <div className="flex gap-3">
                <span className="font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-slate-100 h-fit min-w-[32px] text-center">{item.quantity}</span>
                <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-base leading-tight">{item.name}</p>
                    {item.observation && (
                        <div className="mt-1 flex items-start gap-1 text-yellow-700 bg-yellow-50 border border-yellow-100 px-1.5 py-0.5 rounded text-xs font-medium">
                            <AlertTriangle className="w-3 h-3 mt-0.5" /><span className="uppercase">{item.observation}</span>
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
          {/* Se alguns itens já foram concluídos individualmente, mostra aviso */}
          {order.order_items.some((i:any) => i.status === 'concluido') && (
              <p className="text-[10px] text-green-600 font-bold text-center bg-green-50 p-1 rounded">Alguns itens já finalizados</p>
          )}
        </div>
      </div>
      <div className={cn("p-3 border-t cursor-pointer flex items-center justify-center font-bold text-white transition-colors select-none active:scale-[0.98]", btnColor)} onClick={onAction}>
        {icon}{btnText}
      </div>
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="text-center py-10 text-muted-foreground opacity-50">
            <Utensils className="w-10 h-10 mx-auto mb-2" />
            <p>{label}</p>
        </div>
    )
}

export default function KitchenPage({ params }: { params: { slug: string } }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="kitchen-theme" disableTransitionOnChange>
            <KitchenContent params={params} />
        </ThemeProvider>
    )
}
