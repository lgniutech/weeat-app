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
  Play,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- TIMER SIMPLES ---
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

  // Cores baseadas no tempo de espera (SLA)
  let colorClass = "text-green-600 border-green-200 bg-green-50"
  if (minutes >= 15) colorClass = "text-yellow-600 border-yellow-200 bg-yellow-50"
  if (minutes >= 30) colorClass = "text-red-600 border-red-200 bg-red-50"

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-md border text-sm font-bold font-mono", colorClass)}>
      <Clock className="w-4 h-4" />
      <span>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// --- PÁGINA DA COZINHA (KDS) ---
export default function KitchenPage({ params }: { params: { slug: string } }) {
  const [orders, setOrders] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Buscar pedidos
  const fetchOrders = async () => {
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('slug', params.slug).single()
      if (store) {
        // A action já traz ordenado por antiguidade (created_at ascending)
        const data = await getKitchenOrdersAction(store.id)
        setOrders(data)
        
        // Atualização em Tempo Real (Supabase Realtime)
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
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [params.slug])

  // Função para mover o card
  const handleAdvance = (orderId: string, currentStatus: string) => {
    // Feedback visual imediato (Otimista)
    const originalOrders = [...orders];
    
    // Se estiver finalizando ('preparando' -> 'enviado'), remove da tela imediatamente
    if (currentStatus === 'preparando') {
        setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
        // Se estiver movendo de coluna ('aceito' -> 'preparando'), atualiza status local
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparando' } : o));
    }

    startTransition(async () => {
      const result = await advanceKitchenStatusAction(orderId, currentStatus)
      if (!result.success) {
        // Reverte em caso de erro
        setOrders(originalOrders);
        toast({ title: "Erro", description: result.message, variant: "destructive" })
      } else {
        // Se deu certo e era finalizar, avisa que foi para o garçom
        if (currentStatus === 'preparando') {
            toast({ title: "Prato Finalizado!", description: "Avisando garçom...", className: "bg-green-600 text-white" })
        }
      }
    })
  }

  const handleLogout = async () => {
    await logoutStaffAction()
    router.push(`/${params.slug}/login`)
  }

  // Filtragem das Colunas
  const pendingOrders = orders.filter(o => o.status === 'aceito')
  const prepOrders = orders.filter(o => o.status === 'preparando')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* CABEÇALHO SIMPLES */}
      <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-md">
            <ChefHat className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100">Cozinha</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-600">
           <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </header>

      {/* ÁREA DE PEDIDOS (KANBAN) */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* COLUNA 1: CHEGOU (A FAZER) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              A Fazer
            </h2>
            <Badge variant="secondary" className="font-mono">{pendingOrders.length}</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {pendingOrders.length === 0 && (
                <div className="text-center py-10 text-muted-foreground opacity-50">
                  <Utensils className="w-10 h-10 mx-auto mb-2" />
                  <p>Sem novos pedidos</p>
                </div>
              )}
              {pendingOrders.map((order) => (
                <KitchenCard 
                  key={order.id} 
                  order={order} 
                  btnText="Começar Preparo"
                  btnColor="bg-blue-600 hover:bg-blue-700"
                  btnIcon={<Play className="w-4 h-4 mr-2" />}
                  onAction={() => handleAdvance(order.id, 'aceito')}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* SETA DE FLUXO (VISUAL APENAS EM DESKTOP) */}
        <div className="hidden md:flex items-center justify-center text-slate-300">
            <ArrowRight className="w-8 h-8 opacity-20" />
        </div>

        {/* COLUNA 2: PREPARANDO */}
        <div className="flex-1 flex flex-col bg-orange-50/30 dark:bg-orange-950/10 rounded-xl border border-orange-200 dark:border-orange-900 shadow-sm">
          <div className="p-4 border-b border-orange-100 dark:border-orange-900 flex justify-between items-center bg-orange-100/50 dark:bg-orange-900/20 rounded-t-xl">
            <h2 className="font-bold text-lg text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Preparando
            </h2>
            <Badge className="bg-orange-500 hover:bg-orange-600 border-none font-mono">{prepOrders.length}</Badge>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {prepOrders.length === 0 && (
                <div className="text-center py-10 text-orange-800/40 dark:text-orange-200/40">
                  <p>Nenhum prato no fogo</p>
                </div>
              )}
              {prepOrders.map((order) => (
                <KitchenCard 
                  key={order.id} 
                  order={order} 
                  isCooking={true}
                  btnText="PRONTO (Finalizar)"
                  btnColor="bg-green-600 hover:bg-green-700"
                  btnIcon={<CheckCircle2 className="w-4 h-4 mr-2" />}
                  onAction={() => handleAdvance(order.id, 'preparando')}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

      </main>
    </div>
  )
}

// --- CARD DE PEDIDO LIMPO ---
function KitchenCard({ order, onAction, btnText, btnColor, btnIcon, isCooking }: any) {
  return (
    <Card className={cn(
        "border shadow-sm overflow-hidden transition-all",
        isCooking ? "border-orange-200 dark:border-orange-900 ring-1 ring-orange-100 dark:ring-orange-900" : "border-slate-200"
    )}>
      <div className="p-4">
        {/* TOPO: MESA E TIMER */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              {order.delivery_type === 'mesa' ? 'Mesa' : 'Pedido'}
            </span>
            <span className="text-4xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {order.table_number || "?"}
            </span>
          </div>
          <OrderTimer createdAt={order.created_at} />
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800 my-3" />

        {/* LISTA DE ITENS */}
        <div className="space-y-3">
          {order.order_items.map((item: any) => (
            <div key={item.id} className="text-sm">
              <div className="flex gap-3">
                <span className="font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-slate-100 h-fit min-w-[32px] text-center">
                  {item.quantity}
                </span>
                <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-base leading-tight">
                        {item.name}
                    </p>
                    
                    {/* INGREDIENTES REMOVIDOS (VERMELHO) */}
                    {item.removed_ingredients && JSON.parse(item.removed_ingredients).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {JSON.parse(item.removed_ingredients).map((ing: string, i: number) => (
                                <span key={i} className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded uppercase">
                                    SEM {ing}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* OBSERVAÇÕES GERAIS (AMARELO) */}
                    {item.observation && (
                        <div className="mt-1 flex items-start gap-1 text-yellow-700 bg-yellow-50 border border-yellow-100 px-1.5 py-0.5 rounded text-xs font-medium">
                            <AlertTriangle className="w-3 h-3 mt-0.5" />
                            <span className="uppercase">{item.observation}</span>
                        </div>
                    )}
                     {/* ADICIONAIS (VERDE) */}
                     {item.selected_addons && JSON.parse(item.selected_addons).length > 0 && (
                        <div className="mt-1 text-xs text-green-700 font-medium">
                            + {JSON.parse(item.selected_addons).map((a: any) => a.name).join(", ")}
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTÃO DE AÇÃO */}
      <div 
        className={cn(
            "p-3 border-t cursor-pointer flex items-center justify-center font-bold text-white transition-colors select-none active:scale-[0.98]",
            btnColor
        )}
        onClick={onAction}
      >
        {btnIcon}
        {btnText}
      </div>
    </Card>
  )
}
