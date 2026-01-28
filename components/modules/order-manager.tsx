"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Bike, CheckCircle2, Package, User, Volume2, VolumeX } from "lucide-react"
import { format } from "date-fns"
import { cn, formatPhone } from "@/lib/utils" // IMPORTADO formatPhone

// Definição dos Status e Cores
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500", icon: AlertCircle },
  preparando: { label: "Preparando", color: "bg-blue-500", icon: Package },
  enviado: { label: "Saiu para Entrega", color: "bg-orange-500", icon: Bike },
  entregue: { label: "Entregue", color: "bg-green-600", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-red-600", icon: AlertCircle },
}

export function OrderManager({ store }: { store: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    const data = await getStoreOrdersAction(store.id)
    setOrders(data || [])
    setLoading(false)
  }

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Erro ao tocar som:", e))
    }
  }

  useEffect(() => {
    fetchOrders()
    
    // Inicializa áudio
    audioRef.current = new Audio("/sounds/notification.mp3")

    const supabase = createClient()
    
    const channel = supabase
      .channel('store-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          console.log("Novo pedido recebido!", payload)
          playNotificationSound()
          fetchOrders() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store.id, soundEnabled])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    
    const res = await updateOrderStatusAction(orderId, newStatus)
    if (res?.error) {
      alert("Erro ao atualizar status.")
      fetchOrders()
    }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Gestão de Pedidos
            <Badge variant="outline" className="ml-2">{orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length} Ativos</Badge>
          </h2>
          <p className="text-muted-foreground">Acompanhe seus pedidos em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="h-4 w-4 mr-2 text-green-600" /> : <VolumeX className="h-4 w-4 mr-2 text-slate-400" />}
                {soundEnabled ? "Som Ativado" : "Som Mudo"}
            </Button>
            <Button variant="secondary" onClick={fetchOrders} size="sm">Atualizar</Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-slate-50/50 rounded-xl border p-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             <p>Carregando pedidos...</p>
           </div>
        ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-slate-400">
                <Package className="h-12 w-12 opacity-20 mb-3" />
                <p className="font-medium">Nenhum pedido recebido hoje.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => {
                    const statusInfo = STATUS_MAP[order.status] || STATUS_MAP['pendente']
                    return (
                        <Card key={order.id} className={cn("overflow-hidden border-l-4 transition-all hover:shadow-md", order.status === 'pendente' ? "border-l-yellow-500 bg-yellow-50/30" : "border-l-transparent")}>
                            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="font-mono text-xs text-slate-500">#{order.id.slice(0, 4)}</Badge>
                                        <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "HH:mm")}</span>
                                    </div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" /> {order.customer_name}
                                    </CardTitle>
                                </div>
                                <Badge className={cn("text-white capitalize", statusInfo.color)}>{statusInfo.label}</Badge>
                            </CardHeader>
                            
                            <CardContent className="p-4 py-2 space-y-3">
                                <div className="space-y-1">
                                    {order.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="text-sm border-b border-dashed border-slate-100 last:border-0 pb-1 last:pb-0">
                                            <div className="flex justify-between font-medium text-slate-700">
                                                <span>{item.quantity}x {item.product_name}</span>
                                                <span>{formatCurrency(item.total_price)}</span>
                                            </div>
                                            {/* Tratamento seguro para removed_ingredients e selected_addons */}
                                            {(() => {
                                                let removed = [];
                                                let addons = [];
                                                try { removed = typeof item.removed_ingredients === 'string' ? JSON.parse(item.removed_ingredients) : item.removed_ingredients || [] } catch (e) {}
                                                try { addons = typeof item.selected_addons === 'string' ? JSON.parse(item.selected_addons) : item.selected_addons || [] } catch (e) {}

                                                return (
                                                    <div className="text-xs text-slate-500 pl-4 space-y-0.5">
                                                        {removed.length > 0 && <p className="text-red-500/80">Sem: {removed.join(", ")}</p>}
                                                        {addons.length > 0 && <p className="text-green-600">Add: {addons.map((a: any) => a.name).join(", ")}</p>}
                                                        {item.observation && <p className="italic text-slate-400">" {item.observation} "</p>}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ))}
                                </div>

                                <Separator />
                                
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-start gap-2">
                                        {order.delivery_type === 'entrega' ? <Bike className="h-4 w-4 text-primary shrink-0" /> : <Package className="h-4 w-4 text-orange-500 shrink-0" />}
                                        <div className="flex-1">
                                            <span className="font-bold capitalize">{order.delivery_type}</span>
                                            {order.address && <p className="text-xs text-muted-foreground leading-tight">{order.address}</p>}
                                        </div>
                                    </div>
                                    {order.customer_phone && <p className="text-xs pl-6 text-slate-500">{formatPhone(order.customer_phone)}</p>}
                                </div>
                            </CardContent>

                            <CardFooter className="p-3 bg-slate-50 border-t flex flex-col gap-3">
                                <div className="flex justify-between w-full items-center">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{order.payment_method}</span>
                                    <span className="font-bold text-lg text-slate-900">{formatCurrency(order.total_price)}</span>
                                </div>
                                
                                <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                                    <SelectTrigger className={cn("w-full h-9 font-medium text-white border-0 focus:ring-0", STATUS_MAP[order.status]?.color)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_MAP).map(([key, info]) => (
                                            <SelectItem key={key} value={key} className="cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <info.icon className="h-4 w-4 text-slate-400" /> {info.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        )}
      </ScrollArea>
    </div>
  )
}
