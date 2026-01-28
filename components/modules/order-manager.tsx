"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Bike, CheckCircle2, Package, User, Volume2, VolumeX, ArrowRight, ArrowLeft, Clock, Store, Eye, EyeOff, RotateCcw, XCircle, DollarSign, Trash2, MapPin } from "lucide-react"
import { format } from "date-fns"
import { cn, formatPhone } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const BASE_COLUMNS = [
  { id: 'pendente', label: 'Pendente', color: 'bg-yellow-500', icon: AlertCircle, border: 'border-yellow-500' },
  { id: 'preparando', label: 'Cozinha', color: 'bg-blue-500', icon: Package, border: 'border-blue-500' },
  { id: 'enviado', label: 'Entrega', color: 'bg-orange-500', icon: Bike, border: 'border-orange-500' },
  { id: 'entregue', label: 'Concluído', color: 'bg-green-600', icon: CheckCircle2, border: 'border-green-600' },
]

const CANCELED_COLUMN = { id: 'cancelado', label: 'Cancelado', color: 'bg-red-500', icon: XCircle, border: 'border-red-500' }

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
    if (res?.error) fetchOrders()
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const parseJson = (val: any) => {
      if (!val) return []
      if (typeof val === 'string') {
          try { return JSON.parse(val) } catch (e) { return [] }
      }
      return val
  }

  const visibleColumns = useMemo(() => {
    return showCanceled ? [...BASE_COLUMNS, CANCELED_COLUMN] : BASE_COLUMNS
  }, [showCanceled])

  const getOrdersForColumn = (status: string) => {
    const colOrders = orders.filter(o => o.status === status)
    if (status === 'entregue' || status === 'cancelado') {
        return colOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
        return colOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
      {/* HEADER COMPACTO */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-white border-b shadow-sm h-14">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-800">
            KDS
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full border border-slate-200">
                {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowCanceled(!showCanceled)} title={showCanceled ? "Ocultar Cancelados" : "Ver Cancelados"} className="h-8 w-8 text-slate-500">
                {showCanceled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className={cn("h-8 w-8 transition-colors", soundEnabled ? "text-green-600 bg-green-50" : "text-slate-400")}>
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="h-8 text-xs">Atualizar</Button>
        </div>
      </div>

      {/* ÁREA KANBAN */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-2">
        <div className="flex h-full gap-2 min-w-[1000px]">
            {visibleColumns.map((col) => {
                const colOrders = getOrdersForColumn(col.id)
                return (
                    <div key={col.id} className="flex-1 flex flex-col min-w-[240px] h-full bg-slate-100/50 border rounded-lg overflow-hidden">
                        {/* Header Coluna Super Compacto */}
                        <div className={cn("px-2 py-1.5 font-bold text-white flex justify-between items-center text-xs uppercase tracking-wider shrink-0", col.color)}>
                            <div className="flex items-center gap-1.5">
                                <col.icon className="w-3.5 h-3.5" /> {col.label}
                            </div>
                            <span className="bg-black/20 px-1.5 rounded text-[10px] font-mono">{colOrders.length}</span>
                        </div>

                        {/* Lista de Cards */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-2 scroll-smooth">
                            {colOrders.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-20 text-slate-300 opacity-60">
                                    <p className="text-[10px] uppercase font-bold tracking-widest">Vazio</p>
                                </div>
                            )}
                            
                            {colOrders.map(order => (
                                <Card key={order.id} className="shadow-sm border-0 border-l-[3px] rounded-md overflow-hidden hover:shadow-md transition-all group" style={{ borderLeftColor: order.status === 'pendente' ? '#eab308' : order.status === 'preparando' ? '#3b82f6' : order.status === 'enviado' ? '#f97316' : order.status === 'entregue' ? '#16a34a' : '#ef4444' }}>
                                    
                                    {/* Botão de Cancelar Flutuante (Hover) */}
                                    {['pendente', 'preparando', 'enviado'].includes(order.status) && (
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-sm">
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => moveOrder(order.id, 'cancelado')} className="text-red-600 text-xs">
                                                        Confirmar Cancelar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}

                                    <div className="p-2 space-y-1.5">
                                        {/* Linha 1: ID, Nome e Tempo */}
                                        <div className="flex justify-between items-start leading-none">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-1 rounded">#{order.id.slice(0, 4)}</span>
                                                <h3 className="font-bold text-xs text-slate-900 truncate max-w-[120px]" title={order.customer_name}>{order.customer_name}</h3>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-[10px] font-medium text-slate-500">{format(new Date(order.created_at), "HH:mm")}</span>
                                            </div>
                                        </div>

                                        {/* Linha 2: Valor e Info Entrega */}
                                        <div className="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded">{formatCurrency(order.total_price)}</span>
                                            <div className="flex items-center gap-1 text-slate-500 max-w-[100px] justify-end">
                                                {order.delivery_type === 'entrega' ? <Bike className="w-3 h-3 text-slate-400" /> : <Store className="w-3 h-3 text-orange-400" />}
                                                <span className="truncate">{order.delivery_type === 'entrega' ? 'Entrega' : 'Retirada'}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Lista de Itens Compacta */}
                                        <div className="space-y-1 pt-0.5">
                                            {order.items.map((item: any, idx: number) => {
                                                const removed = parseJson(item.removed_ingredients);
                                                const addons = parseJson(item.selected_addons);
                                                
                                                return (
                                                    <div key={idx} className="text-xs leading-tight">
                                                        <div className="flex gap-1.5 text-slate-800">
                                                            <span className="font-bold w-4 text-right shrink-0 text-slate-400">{item.quantity}x</span>
                                                            <span className="font-medium truncate">{item.product_name}</span>
                                                        </div>
                                                        
                                                        {/* Modificadores (Inline para economizar altura) */}
                                                        {(removed.length > 0 || addons.length > 0 || item.observation) && (
                                                            <div className="pl-6 text-[10px] text-slate-500 space-y-0.5">
                                                                {removed.length > 0 && <span className="block text-red-500/90 leading-none">- Sem {removed.join(", ")}</span>}
                                                                {addons.length > 0 && <span className="block text-green-600/90 leading-none">+ {addons.map((a: any) => a.name).join(", ")}</span>}
                                                                {item.observation && <span className="block text-amber-600 italic leading-none">"{item.observation}"</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Endereço Compacto (Só mostra se for entrega) */}
                                        {order.delivery_type === 'entrega' && order.address && (
                                            <div className="flex items-start gap-1 text-[9px] text-slate-400 pt-1 border-t border-slate-50">
                                                <MapPin className="w-3 h-3 shrink-0 opacity-50" />
                                                <p className="line-clamp-1 leading-none">{order.address}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer de Ações (Botões Menores) */}
                                    <div className="bg-slate-50 p-1.5 flex gap-1.5">
                                        {col.id === 'pendente' && (
                                            <>
                                                <Button variant="outline" size="sm" className="h-6 text-[10px] w-full border-red-100 text-red-500 hover:bg-red-50" onClick={() => moveOrder(order.id, 'cancelado')}>Cancelar</Button>
                                                <Button size="sm" className="h-6 text-[10px] w-full bg-blue-600 hover:bg-blue-700 font-bold" onClick={() => moveOrder(order.id, 'preparando')}>ACEITAR</Button>
                                            </>
                                        )}
                                        {col.id === 'preparando' && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => moveOrder(order.id, 'pendente')}><ArrowLeft className="w-3 h-3" /></Button>
                                                <Button size="sm" className="h-6 text-[10px] w-full bg-orange-500 hover:bg-orange-600 font-bold" onClick={() => moveOrder(order.id, 'enviado')}>PRONTO</Button>
                                            </>
                                        )}
                                        {col.id === 'enviado' && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => moveOrder(order.id, 'preparando')}><ArrowLeft className="w-3 h-3" /></Button>
                                                <Button size="sm" className="h-6 text-[10px] w-full bg-green-600 hover:bg-green-700 font-bold" onClick={() => moveOrder(order.id, 'entregue')}>ENTREGUE</Button>
                                            </>
                                        )}
                                        {col.id === 'entregue' && (
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full text-slate-400" onClick={() => moveOrder(order.id, 'enviado')}><RotateCcw className="w-3 h-3 mr-1.5" /> Desfazer</Button>
                                        )}
                                        {col.id === 'cancelado' && (
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full text-slate-400 hover:text-blue-500" onClick={() => moveOrder(order.id, 'pendente')}><RotateCcw className="w-3 h-3 mr-1.5" /> Restaurar</Button>
                                        )}
                                    </div>
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
