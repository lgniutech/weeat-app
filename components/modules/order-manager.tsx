"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// Removido ScrollArea para usar scroll nativo
import { AlertCircle, Bike, CheckCircle2, Package, User, Volume2, VolumeX, ArrowRight, ArrowLeft, Clock, Store, Eye, EyeOff, RotateCcw, XCircle, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { cn, formatPhone } from "@/lib/utils"

// Definição Base das Colunas
const BASE_COLUMNS = [
  { id: 'pendente', label: 'Pendente (Aceitar)', color: 'bg-yellow-500', icon: AlertCircle },
  { id: 'preparando', label: 'Na Cozinha', color: 'bg-blue-500', icon: Package },
  { id: 'enviado', label: 'Saiu p/ Entrega', color: 'bg-orange-500', icon: Bike },
  { id: 'entregue', label: 'Concluídos', color: 'bg-green-600', icon: CheckCircle2 },
]

const CANCELED_COLUMN = { id: 'cancelado', label: 'Cancelados', color: 'bg-red-500', icon: XCircle }

export function OrderManager({ store }: { store: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCanceled, setShowCanceled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = async () => {
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

  const moveOrder = async (orderId: string, nextStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
    
    const res = await updateOrderStatusAction(orderId, nextStatus)
    if (res?.error) {
        alert("Erro ao mover pedido.")
        fetchOrders()
    }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  // Função segura para parsear JSON do banco
  const parseJson = (val: any) => {
      if (!val) return []
      if (typeof val === 'string') {
          try { return JSON.parse(val) } catch (e) { return [] }
      }
      return val
  }

  // Ordenação: Mais antigos primeiro (FIFO - First In First Out)
  const sortedOrders = useMemo(() => {
      return [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [orders])

  const visibleColumns = useMemo(() => {
    return showCanceled ? [...BASE_COLUMNS, CANCELED_COLUMN] : BASE_COLUMNS
  }, [showCanceled])

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
          <p className="text-sm text-muted-foreground">Pedidos ordenados por chegada (Antigos no topo).</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowCanceled(!showCanceled)} className={cn("transition-all", showCanceled ? "bg-slate-100 text-slate-900 border-slate-300" : "text-slate-500")}>
                {showCanceled ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showCanceled ? "Ocultar Cancelados" : "Ver Cancelados"}
            </Button>

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
            
            {visibleColumns.map((col) => {
                const colOrders = sortedOrders.filter(o => o.status === col.id)
                
                return (
                    <div key={col.id} className="flex-1 flex flex-col min-w-[300px] h-full bg-slate-50 border rounded-xl shadow-sm overflow-hidden transition-all duration-300">
                        {/* Header da Coluna */}
                        <div className={cn("p-3 font-bold text-white flex justify-between items-center text-sm uppercase tracking-wide shrink-0", col.color)}>
                            <div className="flex items-center gap-2">
                                <col.icon className="w-4 h-4" /> {col.label}
                            </div>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{colOrders.length}</span>
                        </div>

                        {/* Lista de Cards - SCROLL NATIVO (Correção de Scroll) */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-3 scroll-smooth">
                            {colOrders.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-300 opacity-60">
                                    <col.icon className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-medium">Vazio</p>
                                </div>
                            )}
                            
                            {colOrders.map(order => (
                                <Card key={order.id} className="shadow-sm border-l-4 animate-in zoom-in-95 duration-200 hover:shadow-md transition-shadow group flex flex-col" style={{ borderLeftColor: order.status === 'pendente' ? '#eab308' : 'transparent' }}>
                                    <CardHeader className="p-3 pb-2 space-y-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 font-mono">#{order.id.slice(0, 4)}</span>
                                                <h3 className="font-bold text-sm text-slate-900 leading-tight">{order.customer_name}</h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-green-700">{formatCurrency(order.total_price)}</span>
                                                <span className="text-[10px] font-medium text-slate-400 flex items-center justify-end gap-1 bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                                                    <Clock className="w-3 h-3" /> {format(new Date(order.created_at), "HH:mm")}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="p-3 py-0 flex-1">
                                        {/* Detalhes do Pedido Completos */}
                                        <div className="text-sm text-slate-700 space-y-2 bg-slate-100/50 p-2.5 rounded border border-slate-200/60">
                                            {order.items.map((item: any, idx: number) => {
                                                const removed = parseJson(item.removed_ingredients);
                                                const addons = parseJson(item.selected_addons);
                                                
                                                return (
                                                    <div key={idx} className="border-b border-dashed border-slate-200 last:border-0 pb-2 last:pb-0">
                                                        <div className="flex justify-between font-bold">
                                                            <span>{item.quantity}x {item.product_name}</span>
                                                        </div>
                                                        
                                                        {/* Adicionais e Remoções */}
                                                        {(removed.length > 0 || addons.length > 0 || item.observation) && (
                                                            <div className="mt-1 ml-1 pl-2 border-l-2 border-slate-300 space-y-0.5 text-xs">
                                                                {removed.length > 0 && (
                                                                    <p className="text-red-600 font-medium">Sem: {removed.join(", ")}</p>
                                                                )}
                                                                {addons.length > 0 && (
                                                                    <p className="text-green-600 font-medium">Add: {addons.map((a: any) => a.name).join(", ")}</p>
                                                                )}
                                                                {item.observation && (
                                                                    <p className="text-slate-500 italic bg-yellow-50 p-1 rounded">Obs: "{item.observation}"</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Dados Entrega */}
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-3 mb-1 truncate bg-white p-1 rounded border border-slate-100">
                                            {order.delivery_type === 'entrega' ? <Bike className="w-3 h-3 text-primary shrink-0" /> : <Store className="w-3 h-3 text-orange-500 shrink-0" />}
                                            <span className="uppercase font-bold shrink-0">{order.delivery_type}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="truncate" title={order.delivery_type === 'entrega' ? order.address : "Retirada no Balcão"}>
                                                {order.delivery_type === 'entrega' ? order.address : "Retirada no Balcão"}
                                            </span>
                                        </div>
                                    </CardContent>

                                    {/* Ações Rápidas */}
                                    <CardFooter className="p-2 pt-2 gap-2 mt-auto">
                                        
                                        {/* PENDENTE */}
                                        {col.id === 'pendente' && (
                                            <div className="grid grid-cols-2 gap-2 w-full">
                                                <Button variant="outline" size="sm" className="h-9 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => moveOrder(order.id, 'cancelado')}>
                                                    <XCircle className="w-3 h-3 mr-1" /> Cancelar
                                                </Button>
                                                <Button size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-700 w-full" onClick={() => moveOrder(order.id, 'preparando')}>
                                                    Aceitar <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* PREPARANDO */}
                                        {col.id === 'preparando' && (
                                            <div className="grid grid-cols-[30%_1fr] gap-2 w-full">
                                                <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-400 hover:text-slate-600 px-0" onClick={() => moveOrder(order.id, 'pendente')} title="Voltar para Pendente">
                                                    <ArrowLeft className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" className="h-9 text-xs w-full bg-orange-500 hover:bg-orange-600" onClick={() => moveOrder(order.id, 'enviado')}>
                                                    Pronto / Enviar <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* ENVIADO */}
                                        {col.id === 'enviado' && (
                                            <div className="grid grid-cols-[30%_1fr] gap-2 w-full">
                                                <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-400 hover:text-slate-600 px-0" onClick={() => moveOrder(order.id, 'preparando')} title="Voltar para Cozinha">
                                                    <ArrowLeft className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" className="h-9 text-xs w-full bg-green-600 hover:bg-green-700" onClick={() => moveOrder(order.id, 'entregue')}>
                                                    Concluir <CheckCircle2 className="w-3 h-3 ml-1" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* ENTREGUE */}
                                        {col.id === 'entregue' && (
                                             <Button variant="ghost" size="sm" className="h-9 text-xs w-full text-slate-400 hover:text-orange-500" onClick={() => moveOrder(order.id, 'enviado')}>
                                                <RotateCcw className="w-3 h-3 mr-2" /> Reverter
                                             </Button>
                                        )}

                                        {/* CANCELADO */}
                                        {col.id === 'cancelado' && (
                                             <Button variant="outline" size="sm" className="h-9 text-xs w-full border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300" onClick={() => moveOrder(order.id, 'pendente')}>
                                                <RotateCcw className="w-3 h-3 mr-2" /> Restaurar Pedido
                                             </Button>
                                        )}

                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            })}

        </div>
      </div>
    </div>
  )
}
