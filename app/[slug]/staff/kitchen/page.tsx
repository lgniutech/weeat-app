"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes" 
import { getKitchenOrdersAction, advanceKitchenStatusAction } from "@/app/actions/kitchen"
import { getStaffSession, logoutStaffAction } from "@/app/actions/staff"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  Moon, 
  Sun, 
  Utensils, 
  AlertTriangle,
  RefreshCw,
  Flame,
  Bike,
  ShoppingBag
} from "lucide-react"
import { cn } from "@/lib/utils"

// Timer
function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000 / 60))
    update()
    const interval = setInterval(update, 60000) // Atualiza a cada minuto
    return () => clearInterval(interval)
  }, [createdAt])

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

function KitchenContent({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const session = await getStaffSession()
      if (!session || session.storeSlug !== slug) {
        // Permite admin e kitchen
        router.push(`/${slug}/staff`)
        return
      }
      setStoreId(session.storeId)
    }
    checkAccess()
  }, [slug, router])

  const fetchOrders = async () => {
    if (!storeId) return
    const data = await getKitchenOrdersAction(storeId)
    setOrders(data)
    setLoading(false)
  }

  // Polling a cada 5 segundos
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [storeId])

  const handleAdvance = (orderId: string, currentStatus: string) => {
    startTransition(async () => {
      // Otimisticamente remove ou atualiza a UI, mas vamos esperar o fetch para garantir sincronia
      const res = await advanceKitchenStatusAction(orderId, currentStatus)
      
      if (res.error) {
        toast({ title: "Erro", description: res.error, variant: "destructive" })
      } else {
        if (currentStatus === 'preparando') {
             toast({ title: "Pedido Pronto!", description: "Garçom notificado (Sino Tocou)." })
        }
        fetchOrders()
      }
    })
  }

  const getDeliveryIcon = (type: string) => {
      if(type === 'mesa') return <Utensils className="w-4 h-4" />
      if(type === 'entrega') return <Bike className="w-4 h-4" />
      return <ShoppingBag className="w-4 h-4" />
  }

  const parseJson = (val: any) => {
    if (!val) return []
    if (typeof val === 'string') { try { return JSON.parse(val) } catch (e) { return [] } }
    return val
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground"><RefreshCw className="w-8 h-8 animate-spin"/></div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none text-slate-900 dark:text-slate-100">KDS Cozinha</h1>
              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                 <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Novos: {orders.filter(o => o.status === 'aceito').length}</Badge>
                 <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Fogo: {orders.filter(o => o.status === 'preparando').length}</Badge>
              </div>
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
            
            <Button variant="ghost" size="icon" onClick={() => logoutStaffAction(slug)} className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground opacity-50">
            <ChefHat className="w-24 h-24 mb-4" />
            <h2 className="text-2xl font-bold">Cozinha Livre</h2>
            <p>Nenhum pedido pendente no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const isNew = order.status === 'aceito';
              
              return (
              <Card key={order.id} className={cn(
                  "flex flex-col border-l-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                  isNew ? "border-l-blue-500" : "border-l-amber-500"
              )}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isNew ? (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">NOVO</Badge>
                            ) : (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-black">NO FOGO</Badge>
                            )}
                        </div>
                        <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {order.delivery_type === 'mesa' ? `Mesa ${order.table_number}` : 'Balcão/Delivery'}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">
                            {order.customer_name}
                        </p>
                    </div>
                    <OrderTimer createdAt={order.created_at} />
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ScrollArea className="h-[200px] w-full pr-4">
                    <ul className="space-y-4">
                      {order.order_items.map((item: any, idx: number) => {
                        const removed = parseJson(item.removed_ingredients)
                        const addons = parseJson(item.selected_addons)
                        
                        return (
                        <li key={idx} className="border-b border-dashed border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                          <div className="flex items-start gap-2">
                              <span className="font-bold text-xl min-w-[24px] text-slate-700 dark:text-slate-300">{item.quantity}x</span>
                              <div className="flex flex-col w-full">
                                <span className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                                  {item.name}
                                </span>
                                
                                {/* Observações do Item */}
                                {item.observation && (
                                  <div className="mt-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-1.5 rounded text-xs border border-yellow-200 dark:border-yellow-900 flex gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5"/> 
                                    <span className="font-bold uppercase">{item.observation}</span>
                                  </div>
                                )}

                                {/* Adicionais e Remoções */}
                                {(removed.length > 0 || addons.length > 0) && (
                                    <div className="mt-1 text-xs space-y-0.5">
                                        {removed.length > 0 && (
                                            <p className="text-red-500 font-bold">🚫 Sem: {removed.map((r:any) => r.name).join(', ')}</p>
                                        )}
                                        {addons.length > 0 && (
                                            <p className="text-green-600 font-bold">➕ Com: {addons.map((a:any) => a.name).join(', ')}</p>
                                        )}
                                    </div>
                                )}
                              </div>
                          </div>
                        </li>
                      )})}
                    </ul>
                  </ScrollArea>
                </CardContent>

                <CardFooter className="pt-2">
                  {isNew ? (
                      <Button 
                        className="w-full h-12 text-lg font-bold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                        onClick={() => handleAdvance(order.id, 'aceito')}
                        disabled={isPending}
                      >
                        <Flame className="mr-2 w-5 h-5 text-orange-500" />
                        COMEÇAR
                      </Button>
                  ) : (
                      <Button 
                        className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg animate-pulse hover:animate-none"
                        onClick={() => handleAdvance(order.id, 'preparando')}
                        disabled={isPending}
                      >
                        <CheckCircle2 className="mr-2 w-6 h-6" />
                        PRONTO!
                      </Button>
                  )}
                </CardFooter>
              </Card>
            )})}
          </div>
        )}
      </main>
    </div>
  )
}

export default function KitchenPageWrapper({ params }: { params: { slug: string } }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="kitchen-theme">
            <KitchenContent params={params} />
        </ThemeProvider>
    )
}
