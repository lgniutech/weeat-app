"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes"
import { getCourierOrdersAction, updateCourierStatusAction } from "@/app/actions/courier"
import { logoutStaffAction } from "@/app/actions/staff"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Bike, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  LogOut, 
  Sun, 
  Moon, 
  PackageCheck,
  ExternalLink,
  AlertCircle,
  Clock,
  ChefHat,
  Banknote
} from "lucide-react"

export default function CourierPage({ params }: { params: { slug: string } }) {
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const fetchOrders = async () => {
    const supabase = require("@/lib/supabase/client").createClient()
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('slug', params.slug).single()
      if (store) {
        const data = await getCourierOrdersAction(store.id)
        setOrders(data)
        
        const channel = supabase
          .channel('courier_orders')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
            () => { getCourierOrdersAction(store.id).then(setOrders) }
          )
          .subscribe()

        return () => supabase.removeChannel(channel)
      }
    } catch (error) { console.error(error) }
  }

  useEffect(() => { fetchOrders() }, [params.slug])

  const handleLogout = async () => {
    await logoutStaffAction(params.slug)
    router.push(`/${params.slug}/staff`)
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const handleStartDelivery = () => {
    if (selectedOrders.length === 0) return

    startTransition(async () => {
      const res = await updateCourierStatusAction(selectedOrders, "em_rota")
      
      if (res.success) {
        toast({ title: "Remessa Iniciada!", description: "Boa entrega!", className: "bg-blue-600 text-white" })
        setSelectedOrders([])
        fetchOrders()
      } else {
        toast({ 
          title: "Atenção!", 
          description: res.message || "Erro ao coletar pedidos.", 
          variant: "destructive" 
        })
        setSelectedOrders([])
        fetchOrders()
      }
    })
  }

  const handleFinishDelivery = (orderId: string) => {
    startTransition(async () => {
      const res = await updateCourierStatusAction([orderId], "concluido")
      if (res.success) {
        toast({ title: "Pedido Entregue!", description: "Parabéns!", className: "bg-green-600 text-white" })
        fetchOrders()
      }
    })
  }

  const calculateRoute = (type: 'google' | 'waze') => {
    const activeOrders = orders.filter(o => o.status === 'em_rota')
    if (activeOrders.length === 0) {
      toast({ title: "Erro", description: "Nenhum pedido em rota para calcular.", variant: "destructive" })
      return
    }

    const addresses = activeOrders.map(o => o.address).filter(Boolean)
    if (addresses.length === 0) {
      toast({ title: "Erro", description: "Nenhum endereço válido encontrado.", variant: "destructive" })
      return
    }

    if (type === 'google') {
      const origin = "current+location"
      const destination = encodeURIComponent(addresses[addresses.length - 1])
      const waypoints = addresses.slice(0, -1).map(addr => encodeURIComponent(addr)).join('|')
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=bicycling`
      window.open(url, '_blank')
    } else {
      const url = `https://waze.com/ul?q=${encodeURIComponent(addresses[0])}&navigate=yes`
      window.open(url, '_blank')
    }
  }

  // --- FUNÇÕES DE AUXÍLIO E CÁLCULO ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  const calculateChange = (changeFor: string, total: number) => {
    if (!changeFor) return null;
    
    // Tenta limpar a string para pegar apenas o número
    // Ex: "R$ 50,00" -> "50.00"
    const cleanStr = changeFor.toString().replace(/[^0-9.,]/g, "").replace(",", ".");
    const changeForNum = parseFloat(cleanStr);
    
    if (isNaN(changeForNum)) return null;
    
    const change = changeForNum - total;
    return change > 0 ? change : 0;
  }

  // Componente de Exibição do Troco
  const ChangeDisplay = ({ order }: { order: any }) => {
    if (!order.change_for) return null;
    
    const changeValue = calculateChange(order.change_for, order.total_price);
    
    return (
        <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-md text-xs border border-yellow-200 dark:border-yellow-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-yellow-600" />
                <span className="font-bold text-sm">Troco: {changeValue !== null ? formatCurrency(changeValue) : "?"}</span>
            </div>
            <span className="text-[10px] text-yellow-700 dark:text-yellow-400 opacity-80">
                (Levar p/ {order.change_for})
            </span>
        </div>
    )
  }

  const kitchenOrders = orders.filter(o => ['aceito', 'preparando'].includes(o.status))
  const readyOrders = orders.filter(o => o.status === 'enviado')
  const inRouteOrders = orders.filter(o => o.status === 'em_rota')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-md">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-none">Entregador</h1>
            <p className="text-xs text-muted-foreground mt-1">Gestão de Entregas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-400 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6">
        
        {/* SEÇÃO: NA COZINHA (VISUALIZAÇÃO APENAS) */}
        {kitchenOrders.length > 0 && (
          <section className="opacity-75 grayscale-[0.3]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <ChefHat className="w-5 h-5" />
                Na Cozinha ({kitchenOrders.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenOrders.map(order => (
                <Card key={order.id} className="p-4 flex items-start gap-4 border-dashed bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-500">#{order.id.slice(-4)}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{order.status}</Badge>
                    </div>
                    <h3 className="font-semibold mt-1 text-slate-600 dark:text-slate-400">{order.customer_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {order.address || "Endereço não informado"}
                    </p>
                    
                    <ChangeDisplay order={order} />

                    <div className="mt-2 pt-2 border-t flex justify-between items-center">
                      <span className="font-bold text-slate-500">{formatCurrency(order.total_price)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}


        {/* SEÇÃO: COLETAR PEDIDOS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-500" />
              Pedidos Prontos ({readyOrders.length})
            </h2>
            {selectedOrders.length > 0 && (
              <Button onClick={handleStartDelivery} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                Coletar Selecionados ({selectedOrders.length})
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.length === 0 && (
              <div className="col-span-full py-10 text-center border-2 border-dashed rounded-xl opacity-50">
                <p>Nenhum pedido aguardando coleta.</p>
              </div>
            )}
            {readyOrders.map(order => (
              <Card key={order.id} className="p-4 flex items-start gap-4 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => toggleOrderSelection(order.id)}>
                <Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => toggleOrderSelection(order.id)} />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm">#{order.id.slice(-4)}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{order.payment_method}</Badge>
                  </div>
                  <h3 className="font-semibold mt-1">{order.customer_name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {order.address || "Endereço não informado"}
                  </p>

                  <ChangeDisplay order={order} />

                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="font-bold text-blue-600">{formatCurrency(order.total_price)}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* SEÇÃO: EM ROTA / REMESSA ATUAL */}
        <section className="pt-6 border-t">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Navigation className="w-5 h-5 text-orange-500" />
              Remessa Atual ({inRouteOrders.length})
            </h2>
            {inRouteOrders.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => calculateRoute('google')} className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Google Maps
                </Button>
                <Button variant="outline" size="sm" onClick={() => calculateRoute('waze')} className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Waze
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {inRouteOrders.length === 0 && (
              <div className="py-10 text-center border-2 border-dashed rounded-xl opacity-50">
                <p>Você não tem pedidos em rota no momento.</p>
              </div>
            )}
            {inRouteOrders.map(order => (
              <Card key={order.id} className="p-4 border-l-4 border-l-orange-500">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{order.id.slice(-4)} - {order.customer_name}</span>
                      {!order.address && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" /> Endereço Falhou
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">{order.address}</p>
                    
                    <ChangeDisplay order={order} />

                    <div className="flex gap-4 mt-2">
                       <span className="text-xs font-medium">Pagamento: {order.payment_method}</span>
                       <span className="text-xs font-bold text-orange-600">Total: {formatCurrency(order.total_price)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => handleFinishDelivery(order.id)} disabled={isPending}>
                      <CheckCircle2 className="w-4 h-4" /> Marcar como Entregue
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
