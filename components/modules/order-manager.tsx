"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card } from "@/components/ui/card" // Usaremos Card puro para ter controle total do padding
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Bike, CheckCircle2, Package, Volume2, VolumeX, ArrowRight, ArrowLeft, Eye, EyeOff, RotateCcw, XCircle, Trash2, MapPin, Store, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const BASE_COLUMNS = [
  { id: 'pendente', label: 'Pendente', color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', icon: AlertCircle },
  { id: 'preparando', label: 'Cozinha', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: Package },
  { id: 'enviado', label: 'Entrega', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', icon: Bike },
  { id: 'entregue', label: 'Concluído', color: 'bg-green-600', text: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
]

const CANCELED_COLUMN = { id: 'cancelado', label: 'Cancelado', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: XCircle }

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
    const isHistory = status === 'entregue' || status === 'cancelado'
    return colOrders.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return isHistory ? dateB - dateA : dateA - dateB
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
      {/* HEADER KDS */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-white border-b shadow-sm h-12">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-slate-800 uppercase">
            KDS <span className="text-slate-400">|</span> Cozinha
            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowCanceled(!showCanceled)} className="h-7 w-7 text-slate-400">
                {showCanceled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className={cn("h-7 w-7 transition-colors", soundEnabled ? "text-green-600 bg-green-50" : "text-slate-400")}>
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="h-7 text-[10px] px-2 ml-1">Atualizar</Button>
        </div>
      </div>

      {/* COLUNAS */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-1.5">
        <div className="flex h-full gap-1.5 min-w-[1000px]">
            {visibleColumns.map((col) => {
                const colOrders = getOrdersForColumn(col.id)
                return (
                    <div key={col.id} className="flex-1 flex flex-col min-w-[220px] h-full bg-slate-200/50 border rounded-lg overflow-hidden">
                        {/* Header Coluna */}
                        <div className={cn("px-2 py-1 font-bold text-white flex justify-between items-center text-[10px] uppercase tracking-wider shrink-0", col.color)}>
                            <div className="flex items-center gap-1">
                                <col.icon className="w-3 h-3" /> {col.label}
                            </div>
                            <span className="bg-black/20 px-1.5 rounded-sm font-mono">{colOrders.length}</span>
                        </div>

                        {/* Lista de Pedidos */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-1 space-y-1.5 scroll-smooth">
                            {colOrders.length === 0 && (
                                <div className="flex items-center justify-center h-full opacity-30">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Vazio</span>
                                </div>
                            )}
                            
                            {colOrders.map(order => (
                                <Card key={order.id} className="shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-0 rounded overflow-hidden group bg-white hover:ring-1 hover:ring-slate-300 transition-all">
                                    {/* Linha Superior: ID, Tempo e Ações Hover */}
                                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-[10px] text-slate-500">#{order.id.slice(0, 4)}</span>
                                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px]">{order.customer_name.split(' ')[0]}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[9px] font-medium text-slate-400 bg-white px-1 rounded border border-slate-100">
                                                <Clock className="w-2.5 h-2.5" /> {format(new Date(order.created_at), "HH:mm")}
                                            </div>
                                            
                                            {/* Dropdown de Cancelar (Só aparece no hover) */}
                                            {['pendente', 'preparando', 'enviado'].includes(order.status) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        <DropdownMenuItem onClick={() => moveOrder(order.id, 'cancelado')} className="text-red-600 text-xs py-1">
                                                            Confirmar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>

                                    {/* Conteúdo: Itens Condensados */}
                                    <div className="px-2 py-1.5 space-y-0.5">
                                        {order.items.map((item: any, idx: number) => {
                                            const removed = parseJson(item.removed_ingredients);
                                            const addons = parseJson(item.selected_addons);
                                            const hasMods = removed.length > 0 || addons.length > 0 || item.observation;
                                            
                                            return (
                                                <div key={idx} className="text-[11px] leading-tight text-slate-800">
                                                    <span className="font-bold mr-1">{item.quantity}x</span>
                                                    <span>{item.product_name}</span>
                                                    
                                                    {/* Modificadores Inline (Economia Maxima de Espaço) */}
                                                    {hasMods && (
                                                        <span className="text-[9px] text-slate-500 ml-1">
                                                            (
                                                            {removed.length > 0 && <span className="text-red-500 decoration-red-500/30 line-through mr-1">sem {removed.join(", ")}</span>}
                                                            {addons.length > 0 && <span className="text-green-600 mr-1">+ {addons.map((a:any) => a.name).join(", ")}</span>}
                                                            {item.observation && <span className="text-amber-600 italic">"{item.observation}"</span>}
                                                            )
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        
                                        {/* Footer Info: Preço e Endereço */}
                                        <div className="flex justify-between items-center pt-1.5 mt-0.5 border-t border-dashed border-slate-100">
                                            <div className="flex items-center gap-1 text-[9px] text-slate-400 max-w-[60%]">
                                                {order.delivery_type === 'entrega' ? <Bike className="w-2.5 h-2.5 shrink-0" /> : <Store className="w-2.5 h-2.5 shrink-0" />}
                                                {order.delivery_type === 'entrega' && <span className="truncate">{order.address}</span>}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1 rounded">{formatCurrency(order.total_price)}</span>
                                        </div>
                                    </div>

                                    {/* Botão de Ação Full Width (Rodapé) */}
                                    {col.id === 'pendente' && (
                                        <div className="grid grid-cols-2 h-6 mt-px">
                                            <button onClick={() => moveOrder(order.id, 'cancelado')} className="bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 text-[10px] font-bold border-t border-r border-slate-100 transition-colors">RECUSAR</button>
                                            <button onClick={() => moveOrder(order.id, 'preparando')} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors">ACEITAR</button>
                                        </div>
                                    )}
                                    
                                    {col.id === 'preparando' && (
                                        <div className="grid grid-cols-[25%_1fr] h-6 mt-px">
                                             <button onClick={() => moveOrder(order.id, 'pendente')} className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-[10px] border-t border-r border-slate-100"><RotateCcw className="w-3 h-3 mx-auto" /></button>
                                             <button onClick={() => moveOrder(order.id, 'enviado')} className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold transition-colors uppercase">Pronto</button>
                                        </div>
                                    )}

                                    {col.id === 'enviado' && (
                                        <div className="grid grid-cols-[25%_1fr] h-6 mt-px">
                                             <button onClick={() => moveOrder(order.id, 'preparando')} className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-[10px] border-t border-r border-slate-100"><RotateCcw className="w-3 h-3 mx-auto" /></button>
                                             <button onClick={() => moveOrder(order.id, 'entregue')} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold transition-colors uppercase">Entregue</button>
                                        </div>
                                    )}

                                    {col.id === 'entregue' && (
                                        <button onClick={() => moveOrder(order.id, 'enviado')} className="w-full h-5 bg-slate-50 hover:bg-orange-50 text-slate-300 hover:text-orange-400 text-[9px] border-t border-slate-100 transition-colors flex items-center justify-center gap-1">
                                            <RotateCcw className="w-2.5 h-2.5" /> Desfazer
                                        </button>
                                    )}
                                    
                                    {col.id === 'cancelado' && (
                                        <button onClick={() => moveOrder(order.id, 'pendente')} className="w-full h-5 bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-400 text-[9px] border-t border-slate-100 transition-colors flex items-center justify-center gap-1">
                                            <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                                        </button>
                                    )}
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
