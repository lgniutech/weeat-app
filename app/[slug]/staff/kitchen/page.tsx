"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getKitchenOrdersAction, markOrderReadyAction } from "@/app/actions/kitchen"
import { getStaffSession, logoutStaffAction } from "@/app/actions/staff"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  Moon, 
  Sun, 
  Utensils, 
  AlertTriangle,
  RefreshCw
} from "lucide-react"

// Componente do Timer Individual
function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000 / 60)) // Minutos
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  // Cores do Semáforo (Funcionam bem no Claro e Escuro)
  let colorClass = "text-emerald-600 dark:text-emerald-500" 
  if (elapsed >= 10) colorClass = "text-amber-600 dark:text-amber-500" 
  if (elapsed >= 20) colorClass = "text-red-600 dark:text-red-500 animate-pulse" 

  return (
    <div className={`flex items-center gap-1 font-mono font-bold text-xl ${colorClass}`}>
      <Clock className="w-5 h-5" />
      {elapsed} min
    </div>
  )
}

export default function KitchenPage({ params }: { params: { slug: string } }) {
  const slug = params.slug

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [storeId, setStoreId] = useState<string | null>(null)

  // 1. Verificar Acesso
  useEffect(() => {
    async function checkAccess() {
      const session = await getStaffSession()
      if (!session || session.storeSlug !== slug || session.role !== 'kitchen') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão de cozinheiro.", variant: "destructive" })
        router.push(`/${slug}/staff`)
        return
      }
      setStoreId(session.storeId)
    }
    checkAccess()
  }, [slug, router, toast])

  // 2. Buscar Pedidos
  const fetchOrders = async () => {
    if (!storeId) return
    const data = await getKitchenOrdersAction(storeId)
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [storeId])

  // 3. Ação: Marcar como Pronto
  const handleReady = (orderId: string) => {
    startTransition(async () => {
      setOrders(prev => prev.filter(o => o.id !== orderId))
      
      const res = await markOrderReadyAction(orderId, slug)
      if (res.error) {
        toast({ title: "Erro", description: res.error, variant: "destructive" })
        fetchOrders()
      } else {
        toast({ title: "Pedido Pronto!", description: "Notificando garçons/entregadores." })
      }
    })
  }

  const handleLogout = async () => {
    await logoutStaffAction(slug)
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground"><RefreshCw className="w-8 h-8 animate-spin"/></div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* HEADER KDS */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none text-slate-900 dark:text-slate-100">KDS Cozinha</h1>
              <p className="text-xs text-muted-foreground">{orders.length} pedidos na fila</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* GRID DE PEDIDOS */}
      <main className="p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground opacity-50">
            <Utensils className="w-24 h-24 mb-4" />
            <h2 className="text-2xl font-bold">Cozinha Livre</h2>
            <p>Nenhum pedido pendente no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="flex flex-col border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-900 dark:text-slate-100">#{order.id.slice(0, 4)}</CardTitle>
                      <p className="text-sm font-medium text-muted-foreground truncate max-w-[150px]">
                        {order.customer_name}
                      </p>
                    </div>
                    <OrderTimer createdAt={order.created_at} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="uppercase text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                      {order.delivery_type === 'mesa' ? 'Mesa' : order.delivery_type}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ScrollArea className="h-[200px] w-full pr-4">
                    <ul className="space-y-3">
                      {order.order_items.map((item: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm border-b border-dashed border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                          <span className="font-bold text-lg min-w-[24px] text-primary">{item.quantity}x</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                              {item.name}
                            </span>
                            {item.add_ons && (
                               <span className="text-xs text-muted-foreground italic">+ {item.add_ons}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {order.notes && (
                      <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-100 dark:border-amber-900/50">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3"/> Obs:
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">{order.notes}</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button 
                    className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none transition-all active:scale-95"
                    onClick={() => handleReady(order.id)}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="mr-2 w-6 h-6" />
                    PRONTO
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
