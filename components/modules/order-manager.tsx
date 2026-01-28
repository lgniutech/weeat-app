"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Bike, CheckCircle2, Package, User, Volume2, VolumeX, ArrowRight, Clock, Store, MapPin, XCircle } from "lucide-react"
import { format } from "date-fns"
import { cn, formatPhone } from "@/lib/utils"

// Definição das Colunas do Kanban
const KANBAN_COLUMNS = [
  { id: 'pendente', label: 'Pendente (Aceitar)', color: 'bg-yellow-500', icon: AlertCircle },
  { id: 'preparando', label: 'Na Cozinha', color: 'bg-blue-500', icon: Package },
  { id: 'enviado', label: 'Saiu p/ Entrega', color: 'bg-orange-500', icon: Bike },
  { id: 'entregue', label: 'Concluídos', color: 'bg-green-600', icon: CheckCircle2 },
]

export function OrderManager({ store }: { store: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = async () => {
    // Não ativa loading full para não piscar a tela toda hora no refresh
    const data = await getStoreOrdersAction(store.id)
    setOrders(data || [])
    setLoading(false)
  }

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log("Erro ao tocar som:", e))
    }
  }

  useEffect(() => {
    fetchOrders()
    audioRef.current = new Audio("/sounds/notification.mp3")

    const supabase = createClient()
    const channel = supabase
      .channel('store-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          console.log("Novo pedido!", payload)
          playNotificationSound()
          fetchOrders()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [store.id, soundEnabled])

  // Lógica para mover card
  const moveOrder = async (orderId: string, nextStatus: string) => {
    // Atualização Otimista (UI primeiro)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
    
    const res = await updateOrderStatusAction(orderId, nextStatus)
    if (res?.error) {
        alert("Erro ao mover pedido.")
        fetchOrders() // Reverte
    }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  // Filtra pedidos por coluna
  const getOrdersByStatus = (status: string) => {
    // Se for coluna "entregue", mostra também cancelados ou mantém só os do dia? 
    // Por enquanto mostra entregues recentes.
    return orders.filter(o => o.status === status)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* HEADER DA OPERAÇÃO */}
      <div className="flex items-center justify-between p-4 pb-2 shrink-0 bg-white border-b">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Monitor de Pedidos (KDS)
            <Badge variant="secondary" className="ml-2 font-mono">
                {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length} Fila
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">Arraste ou clique para mover os pedidos.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant={soundEnabled ? "default" : "outline"} size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className={cn("transition-all", soundEnabled ? "bg-green-600 hover:bg-green-700" : "")}>
                {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2 text-slate-400" />}
                {soundEnabled ? "Som Ligado" : "Mudo"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders}>Atualizar</Button>
        </div>
      </div>

      {/* ÁREA DE COLUNAS (KANBAN) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-100/50 p-4">
        <div className="flex h-full gap-4 min-w-[1000px]">
            
            {KANBAN_COLUMNS.map((col) => {
                const colOrders = getOrdersByStatus(col.id)
                return (
                    <div key={col.id} className="flex-1 flex flex-col min-w-[280px] h-full bg-slate-50 border rounded-xl shadow-sm overflow-hidden">
                        {/* Header da Coluna */}
                        <div className={cn("p-3 font-bold text-white flex justify-between items-center text-sm uppercase tracking-wide", col.color)}>
                            <div className="flex items-center gap-2">
                                <col.icon className="w-4 h-4" /> {col.label}
                            </div>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{colOrders.length}</span>
                        </div>

                        {/* Lista de Cards */}
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-3">
                                {colOrders.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-32 text-slate-300 opacity-60">
                                        <col.icon className="w-8 h-8 mb-2" />
                                        <p className="text-xs font-medium">Vazio</p>
                                    </div>
                                )}
                                
                                {colOrders.map(order => (
                                    <Card key={order.id} className="shadow-sm border-l-4 animate-in zoom-in-95 duration-200 hover:shadow-md transition-shadow" style={{ borderLeftColor: order.status === 'pendente' ? '#eab308' : 'transparent' }}>
                                        <CardHeader className="p-3 pb-1 space-y-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-500 font-mono">#{order.id.slice(0, 4)}</span>
                                                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{order.customer_name}</h3>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    <Clock className="w-3 h-3" /> {format(new Date(order.created_at), "HH:mm")}
                                                </span>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="p-3 py-2 space-y-2">
                                            {/* Resumo dos Itens (Max 3 linhas para não poluir) */}
                                            <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-2 rounded border border-slate-100/50">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between">
                                                        <span className="font-semibold">{item.quantity}x {item.product_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Dados Entrega */}
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                                                {order.delivery_type === 'entrega' ? <Bike className="w-3 h-3 text-primary" /> : <Store className="w-3 h-3 text-orange-500" />}
                                                <span className="uppercase font-bold">{order.delivery_type}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="truncate">{order.delivery_type === 'entrega' ? order.address : "Retirada no Balcão"}</span>
                                            </div>
                                        </CardContent>

                                        {/* Ações Rápidas */}
                                        <CardFooter className="p-2 pt-0 gap-2">
                                            {col.id === 'pendente' && (
                                                <div className="grid grid-cols-2 gap-2 w-full">
                                                    <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => moveOrder(order.id, 'cancelado')}>
                                                        <XCircle className="w-3 h-3 mr-1" /> Cancelar
                                                    </Button>
                                                    <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 w-full" onClick={() => moveOrder(order.id, 'preparando')}>
                                                        Aceitar <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </div>
                                            )}
                                            {col.id === 'preparando' && (
                                                 <Button size="sm" className="h-8 text-xs w-full bg-orange-500 hover:bg-orange-600" onClick={() => moveOrder(order.id, 'enviado')}>
                                                    Pronto / Enviar <ArrowRight className="w-3 h-3 ml-1" />
                                                 </Button>
                                            )}
                                            {col.id === 'enviado' && (
                                                 <Button size="sm" className="h-8 text-xs w-full bg-green-600 hover:bg-green-700" onClick={() => moveOrder(order.id, 'entregue')}>
                                                    Concluir Entrega <CheckCircle2 className="w-3 h-3 ml-1" />
                                                 </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )
            })}

        </div>
      </div>
    </div>
  )
}
