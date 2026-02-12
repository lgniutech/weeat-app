"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getStoreOrdersAction, updateOrderStatusAction } from "@/app/actions/order"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Bike, CheckCircle2, Package, Volume2, VolumeX, Eye, EyeOff, RotateCcw, XCircle, Trash2, MapPin, Store, Clock, Timer, ArrowLeft, MessageSquareWarning, Printer, Phone, ExternalLink, MessageCircle, DollarSign, BellRing, Utensils } from "lucide-react"
import { format, differenceInMinutes, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

// DEFINIÇÃO DAS COLUNAS (Removida a coluna 'Pendente')
const BASE_COLUMNS = [
  { id: 'preparando', label: 'Cozinha', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', icon: Package },
  { id: 'enviado', label: 'Pronto / Expedição', color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', icon: BellRing },
  { id: 'entregue', label: 'Concluído', color: 'bg-green-600', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
]

const CANCELED_COLUMN = { id: 'cancelado', label: 'Cancelado', color: 'bg-red-500', text: 'text-red-700 dark:text-red-400', icon: XCircle }

export function OrderManager({ store }: { store: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCanceled, setShowCanceled] = useState(false)
  const [now, setNow] = useState(new Date())
  
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  
  const [viewOrder, setViewOrder] = useState<any | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const data = await getStoreOrdersAction(store.id, dateStr)
    setOrders(data || [])
    setLoading(false)
  }

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log("Erro som:", e))
    }
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => { fetchOrders() }, 30000) 
    return () => clearInterval(interval)
  }, [selectedDate, store.id])

  useEffect(() => {
    fetchOrders()
    audioRef.current = new Audio("/som-pedido.mp3")

    const supabase = createClient()
    const channel = supabase
      .channel('store-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          if (isToday(selectedDate)) {
             playNotificationSound()
             fetchOrders()
          }
        }
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
           fetchOrders()
           if (viewOrder && payload.new.id === viewOrder.id) {
               setTimeout(async () => {
                   const dateStr = format(selectedDate, 'yyyy-MM-dd')
                   const data = await getStoreOrdersAction(store.id, dateStr)
                   const updated = data.find((o: any) => o.id === payload.new.id)
                   if (updated) setViewOrder(updated)
               }, 500)
           }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [store.id, soundEnabled, selectedDate, viewOrder])

  const moveOrder = async (orderId: string, nextStatus: string) => {
    if (viewOrder?.id === orderId) setViewOrder(null)
    const nowISO = new Date().toISOString()
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus, last_status_change: nowISO } : o))
    const res = await updateOrderStatusAction(orderId, nextStatus)
    if (res?.error) fetchOrders()
  }

  const handleCancelClick = (orderId: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setOrderToCancel(orderId)
      setCancelReason("")
      setIsCancelOpen(true)
      setViewOrder(null) 
  }

  const confirmCancel = async () => {
      if (!orderToCancel) return
      const nowISO = new Date().toISOString()
      setOrders(prev => prev.map(o => o.id === orderToCancel ? { ...o, status: 'cancelado', last_status_change: nowISO, cancellation_reason: cancelReason } : o))
      setIsCancelOpen(false)
      const res = await updateOrderStatusAction(orderToCancel, 'cancelado', cancelReason)
      if (res?.error) { alert("Erro ao cancelar pedido."); fetchOrders(); }
  }

  const handlePrint = (order: any) => {
      const w = window.open('', '_blank', 'width=400,height=600')
      if (!w) return
      const itemsHtml = order.items.map((item: any) => {
          const removed = parseJson(item.removed_ingredients)
          const addons = parseJson(item.selected_addons)
          return `
            <div style="margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
                <div style="font-weight: bold; font-size: 14px;">${item.quantity}x ${item.product_name}</div>
                ${removed.length ? `<div style="font-size: 12px; text-decoration: line-through;">Sem: ${removed.join(', ')}</div>` : ''}
                ${addons.length ? `<div style="font-size: 12px;">+ ${addons.map((a:any) => a.name).join(', ')}</div>` : ''}
                ${item.observation ? `<div style="font-size: 12px; font-weight: bold;">OBS: ${item.observation}</div>` : ''}
                <div style="text-align: right; font-size: 12px;">${formatCurrency(item.total_price * item.quantity)}</div>
            </div>
          `
      }).join('')

      w.document.write(`
        <html>
        <head>
            <title>Pedido #${order.id.slice(0,4)}</title>
            <style>
                body { font-family: 'Courier New', monospace; width: 300px; padding: 10px; font-size: 12px; }
                .header { text-align: center; margin-bottom: 10px; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .bold { font-weight: bold; }
                .big { font-size: 16px; }
                .flex { display: flex; justify-content: space-between; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="big bold">${store.name}</div>
                <div>${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</div>
                <div class="big bold" style="margin-top: 5px;">PEDIDO #${order.id.slice(0,4)}</div>
            </div>
            <div class="divider"></div>
            <div>
                <div class="bold">${order.customer_name}</div>
                <div>${order.customer_phone}</div>
                <div style="margin-top: 5px;">${order.delivery_type === 'entrega' ? `Entrega: ${order.address}` : (order.delivery_type === 'mesa' ? `Mesa: ${order.table_number}` : 'RETIRADA NO BALCÃO')}</div>
            </div>
            <div class="divider"></div>
            ${itemsHtml}
            <div class="flex bold big" style="margin-top: 10px;">
                <span>TOTAL</span>
                <span>${formatCurrency(order.total_price)}</span>
            </div>
            <div style="margin-top: 10px;">
                Pagamento: ${order.payment_method}
                ${order.change_for ? `<br/>Troco para: ${order.change_for}` : ''}
            </div>
            <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
        </html>
      `)
      w.document.close()
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  const parseJson = (val: any) => {
      if (!val) return []
      if (typeof val === 'string') { try { return JSON.parse(val) } catch (e) { return [] } }
      return val
  }
  const visibleColumns = useMemo(() => { return showCanceled ? [...BASE_COLUMNS, CANCELED_COLUMN] : BASE_COLUMNS }, [showCanceled])

  const getOrdersForColumn = (columnId: string) => {
    const colOrders = orders.filter(o => {
        if (columnId === 'preparando') {
            return o.status === 'preparando' || o.status === 'aceito'; 
        }
        if (columnId === 'entregue') {
             return o.status === 'entregue' || o.status === 'concluido';
        }
        return o.status === columnId;
    })
    
    const isHistory = columnId === 'entregue' || columnId === 'cancelado'
    return colOrders.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return isHistory ? dateB - dateA : dateA - dateB
    })
  }

  const getTimeInStage = (lastChange: string, createdAt: string, status: string) => {
      const dateRef = lastChange ? new Date(lastChange) : new Date(createdAt)
      const minutes = differenceInMinutes(now, dateRef)
      if (status === 'entregue' || status === 'cancelado' || status === 'concluido') return format(dateRef, "HH:mm")
      if (minutes < 1) return "Agora"
      if (minutes < 60) return `${minutes} min`
      return format(dateRef, "HH:mm")
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.valueAsDate) { setSelectedDate(new Date(e.target.value + 'T00:00:00')) }
  }
  const handleSetToday = () => setSelectedDate(new Date())
  const isFilterToday = isToday(selectedDate)

  const getWhatsappLink = (phone: string, name: string) => {
      const clean = phone.replace(/\D/g, "")
      return `https://wa.me/55${clean}?text=Olá ${name}, sobre seu pedido no ${store.name}...`
  }
  const getMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  const getReadyButtonText = (type: string) => {
      if (type === 'mesa') return "LEVAR À MESA"
      if (type === 'retirada') return "CHAMAR CLIENTE"
      return "SAIU P/ ENTREGA"
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors">
      <style jsx global>{`
        .full-picker-input::-webkit-calendar-picker-indicator {
            position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
        }
      `}</style>

      {/* HEADER KDS */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 shadow-sm h-14 transition-colors">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100 uppercase">
            KDS <span className="text-slate-400">|</span> Cozinha
            <span className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado' && o.status !== 'concluido').length}
            </span>
          </h2>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
             <Button 
                size="sm" 
                variant={isFilterToday ? "default" : "ghost"} 
                className={cn("h-7 text-xs font-bold transition-all", isFilterToday ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-zinc-700")}
                onClick={handleSetToday}
             >
                Hoje
             </Button>
             
             <div className="relative group">
                 <div className={cn("h-7 px-3 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 rounded cursor-pointer transition-colors min-w-[90px] pointer-events-none select-none", !isFilterToday && "bg-white dark:bg-zinc-900 shadow-sm border border-slate-200/50 dark:border-zinc-700 group-hover:bg-slate-50 dark:group-hover:bg-zinc-800")}>
                    {format(selectedDate, 'dd/MM/yyyy')}
                 </div>
                 <input 
                    type="date" 
                    className="full-picker-input absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                    value={format(selectedDate, 'yyyy-MM-dd')} 
                    onChange={handleDateChange} 
                    onClick={(e) => {try{e.currentTarget.showPicker()}catch(err){}}} 
                 />
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowCanceled(!showCanceled)} className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:dark:bg-zinc-800" title={showCanceled ? "Ocultar Cancelados" : "Ver Cancelados"}>
                {showCanceled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className={cn("h-8 w-8 transition-colors", soundEnabled ? "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" : "text-slate-400 dark:text-slate-500")} title="Som de Notificação">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="h-8 text-[10px] px-3 ml-1 gap-1 dark:border-zinc-700 dark:text-slate-300">
                <RotateCcw className="w-3 h-3" /> Atualizar
            </Button>
        </div>
      </div>

      {/* COLUNAS */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-1.5">
        <div className="flex h-full gap-1.5 min-w-[1000px]">
            {visibleColumns.map((col) => {
                const colOrders = getOrdersForColumn(col.id)
                return (
                    <div key={col.id} className="flex-1 flex flex-col min-w-[220px] h-full bg-slate-200/50 dark:bg-zinc-900/50 border dark:border-zinc-800 rounded-lg overflow-hidden transition-colors">
                        {/* Header Coluna */}
                        <div className={cn("px-2 py-1.5 font-bold text-white flex justify-between items-center text-[10px] uppercase tracking-wider shrink-0", col.color)}>
                            <div className="flex items-center gap-1">
                                <col.icon className="w-3 h-3" /> {col.label}
                            </div>
                            <span className="bg-black/20 px-1.5 rounded-sm font-mono">{colOrders.length}</span>
                        </div>

                        {/* Lista de Pedidos */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-1 space-y-1.5 scroll-smooth">
                            {colOrders.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full opacity-40 gap-1 text-slate-400 dark:text-slate-500">
                                    <span className="text-[10px] font-bold uppercase">Sem Pedidos</span>
                                    {!isFilterToday && <span className="text-[9px]">nesta data</span>}
                                </div>
                            )}
                            
                            {colOrders.map(order => {
                                const timeInStage = getTimeInStage(order.last_status_change, order.created_at, order.status)
                                const isLongWait = differenceInMinutes(now, new Date(order.last_status_change || order.created_at)) > 15 && order.status !== 'entregue' && order.status !== 'cancelado' && order.status !== 'concluido';
                                
                                return (
                                <Card key={order.id} className={cn("shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-0 rounded overflow-hidden group bg-white dark:bg-zinc-800 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer dark:text-slate-100", isLongWait ? "ring-1 ring-red-200 dark:ring-red-900/50" : "")}>
                                    
                                    <div onClick={() => setViewOrder(order)}>
                                        {/* CABEÇALHO DO CARD */}
                                        <div className="flex justify-between items-start bg-slate-50 dark:bg-zinc-800/80 px-2 py-1.5 border-b border-slate-100 dark:border-zinc-700">
                                            
                                            <div className="flex flex-col gap-0.5 overflow-hidden flex-1 mr-2">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                     <span className="font-mono font-bold shrink-0">#{order.id.slice(0, 4)}</span>
                                                     <div className="flex items-center gap-1 text-[9px] opacity-80">
                                                        <Clock className="w-2.5 h-2.5" /> {format(new Date(order.created_at), "HH:mm")}
                                                     </div>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={order.customer_name}>
                                                    {order.customer_name.split(' ')[0]}
                                                    {/* Badge visual para saber se é NOVO (Aceito) */}
                                                    {order.status === 'aceito' && <span className="ml-2 text-[9px] bg-green-100 text-green-700 px-1 rounded border border-green-200">NOVO</span>}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className={cn("flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border", 
                                                    isLongWait ? "bg-red-50 text-red-600 border-red-100 animate-pulse dark:bg-red-900/30 dark:text-red-300 dark:border-red-900" : "bg-white text-slate-600 border-slate-100 dark:bg-zinc-700 dark:text-slate-300 dark:border-zinc-600")} 
                                                    title="Tempo nesta etapa">
                                                    
                                                    <span className="font-normal text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">Tempo:</span>
                                                    {order.status === 'entregue' || order.status === 'concluido' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                                                    {timeInStage}
                                                </div>
                                                
                                                {['preparando', 'aceito', 'enviado'].includes(order.status) && (
                                                    <button 
                                                        className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" 
                                                        onClick={(e) => handleCancelClick(order.id, e)}
                                                        title="Cancelar Pedido"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="px-2 py-1.5 space-y-0.5 pointer-events-none">
                                            {order.status === 'cancelado' && order.cancellation_reason && (
                                                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-1 rounded text-[10px] mb-1 flex items-start gap-1">
                                                    <MessageSquareWarning className="w-3 h-3 shrink-0 mt-0.5" />
                                                    <span className="font-medium leading-tight">{order.cancellation_reason}</span>
                                                </div>
                                            )}

                                            {order.items.map((item: any, idx: number) => {
                                                const removed = parseJson(item.removed_ingredients);
                                                const addons = parseJson(item.selected_addons);
                                                const hasMods = removed.length > 0 || addons.length > 0 || item.observation;
                                                return (
                                                    <div key={idx} className="text-[11px] leading-tight text-slate-800 dark:text-slate-200">
                                                        <span className="font-bold mr-1">{item.quantity}x</span>
                                                        <span>{item.product_name}</span>
                                                        {hasMods && <span className="text-[9px] text-slate-500 dark:text-slate-400 ml-1">(...)</span>}
                                                    </div>
                                                )
                                            })}
                                            
                                            <div className="flex justify-between items-center pt-1.5 mt-0.5 border-t border-dashed border-slate-100 dark:border-zinc-700">
                                                <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 max-w-[60%]">
                                                    {order.delivery_type === 'entrega' ? <Bike className="w-2.5 h-2.5 shrink-0" /> : (order.delivery_type === 'mesa' ? <UtensilsIcon className="w-2.5 h-2.5 shrink-0" /> : <Store className="w-2.5 h-2.5 shrink-0" />)}
                                                    {order.delivery_type === 'entrega' && <span className="truncate">{order.address}</span>}
                                                    {order.delivery_type === 'mesa' && <span className="truncate font-bold text-blue-600 dark:text-blue-400">Mesa {order.table_number}</span>}
                                                    {order.delivery_type === 'retirada' && <span className="truncate">Balcão</span>}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-zinc-700 px-1 rounded">{formatCurrency(order.total_price)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botões de Ação */}
                                    {col.id === 'preparando' && (
                                        <div className="w-full h-6 mt-px">
                                             <button onClick={() => moveOrder(order.id, 'enviado')} className="w-full h-full bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold transition-colors uppercase rounded-b">
                                                 {order.delivery_type === 'mesa' ? "SERVIR" : "PRONTO"}
                                             </button>
                                        </div>
                                    )}
                                    {col.id === 'enviado' && (
                                        <div className="grid grid-cols-[25%_1fr] h-6 mt-px">
                                             <button onClick={() => moveOrder(order.id, 'preparando')} className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-[10px] border-t border-r border-slate-100 dark:border-zinc-700"><ArrowLeft className="w-3 h-3 mx-auto" /></button>
                                             <button onClick={() => moveOrder(order.id, 'entregue')} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold transition-colors uppercase">
                                                 {getReadyButtonText(order.delivery_type)}
                                             </button>
                                        </div>
                                    )}
                                    {col.id === 'entregue' && (
                                        <button onClick={() => moveOrder(order.id, 'enviado')} className="w-full h-5 bg-slate-50 hover:bg-orange-50 dark:bg-zinc-800 dark:hover:bg-orange-900/30 text-slate-300 hover:text-orange-400 dark:text-slate-600 dark:hover:text-orange-300 text-[9px] border-t border-slate-100 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1">
                                            <RotateCcw className="w-2.5 h-2.5" /> Desfazer
                                        </button>
                                    )}
                                    {col.id === 'cancelado' && (
                                        <button onClick={() => moveOrder(order.id, 'aceito')} className="w-full h-5 bg-slate-50 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 text-slate-300 hover:text-blue-400 dark:text-slate-600 dark:hover:text-blue-300 text-[9px] border-t border-slate-100 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1">
                                            <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                                        </button>
                                    )}
                                </Card>
                            )})}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* MODAL DE CANCELAMENTO */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Cancelar Pedido</DialogTitle>
                <DialogDescription>
                    Motivo do cancelamento (opcional).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
                <Textarea 
                    id="reason" 
                    placeholder="Ex: Cliente desistiu..." 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                />
            </div>
            <DialogFooter className="flex flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Voltar</Button>
                <Button variant="destructive" onClick={confirmCancel}>Confirmar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHES DO PEDIDO */}
      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
         <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
             {viewOrder && (
                 <>
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-zinc-800">
                         <div className="flex flex-col">
                            <DialogTitle className="text-xl flex items-center gap-2">
                                Pedido #{viewOrder.id.slice(0,4)}
                                <Badge variant="outline" className={cn(
                                    BASE_COLUMNS.find(c => c.id === viewOrder.status)?.text || 'text-slate-500', 
                                    BASE_COLUMNS.find(c => c.id === viewOrder.status)?.color.replace('bg-', 'bg-opacity-10 bg-') || 'bg-slate-100'
                                )}>
                                    {viewOrder.status.toUpperCase()}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>{format(new Date(viewOrder.created_at), "dd/MM/yyyy 'às' HH:mm")}</DialogDescription>
                         </div>
                         <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePrint(viewOrder)}>
                             <Printer className="w-4 h-4" /> Imprimir
                         </Button>
                    </DialogHeader>

                    {/* CONTEÚDO DO MODAL */}
                    <div className="grid md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-6">
                             {/* CLIENTE */}
                             <div className="space-y-2">
                                 <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> Cliente</h4>
                                 <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-lg border dark:border-zinc-800">
                                     <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{viewOrder.customer_name}</p>
                                     <div className="flex items-center gap-2 mt-1">
                                         <p className="text-slate-600 dark:text-slate-400">{viewOrder.customer_phone}</p>
                                         <a href={getWhatsappLink(viewOrder.customer_phone, viewOrder.customer_name)} target="_blank" rel="noreferrer" className="text-green-600 dark:text-green-500 hover:underline text-xs font-bold flex items-center gap-1">
                                             <MessageCircle className="w-3 h-3" /> WhatsApp
                                         </a>
                                     </div>
                                 </div>
                             </div>

                             {/* ENDEREÇO / MESA */}
                             <div className="space-y-2">
                                 <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                     {viewOrder.delivery_type === 'entrega' ? <Bike className="w-4 h-4" /> : (viewOrder.delivery_type === 'mesa' ? <UtensilsIcon className="w-4 h-4" /> : <Store className="w-4 h-4" />)} 
                                     {viewOrder.delivery_type === 'entrega' ? 'Endereço de Entrega' : (viewOrder.delivery_type === 'mesa' ? 'Mesa' : 'Retirada')}
                                 </h4>
                                 <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-lg border dark:border-zinc-800">
                                     {viewOrder.delivery_type === 'entrega' ? (
                                         <>
                                             <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{viewOrder.address}</p>
                                             <a href={getMapsLink(viewOrder.address)} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold flex items-center gap-1 mt-2">
                                                 <ExternalLink className="w-3 h-3" /> Abrir no Maps
                                             </a>
                                         </>
                                     ) : (viewOrder.delivery_type === 'mesa' ? 
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Mesa {viewOrder.table_number}</p>
                                      : <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente irá retirar no balcão.</p>
                                     )}
                                 </div>
                             </div>

                             {/* PAGAMENTO */}
                             <div className="space-y-2">
                                 <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Pagamento</h4>
                                 <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
                                     <div>
                                         <p className="font-bold text-sm capitalize text-slate-900 dark:text-slate-100">{viewOrder.payment_method}</p>
                                         {viewOrder.change_for && <p className="text-xs text-slate-500 dark:text-slate-400">Troco para: {viewOrder.change_for}</p>}
                                     </div>
                                     <div className="text-right">
                                         <p className="text-xs text-muted-foreground">Total</p>
                                         <p className="font-bold text-lg text-green-700 dark:text-green-400">{formatCurrency(viewOrder.total_price)}</p>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* ITENS */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens do Pedido</h4>
                            <div className="border dark:border-zinc-800 rounded-lg divide-y dark:divide-zinc-800 max-h-[400px] overflow-y-auto bg-white dark:bg-zinc-900">
                                {viewOrder.items.map((item: any, idx: number) => {
                                    const removed = parseJson(item.removed_ingredients);
                                    const addons = parseJson(item.selected_addons);
                                    return (
                                        <div key={idx} className="p-3 bg-white dark:bg-zinc-900">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                    <span className="font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm h-fit text-slate-900 dark:text-slate-100">{item.quantity}x</span>
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.product_name}</p>
                                                        {removed.length > 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 line-through decoration-red-300">Sem: {removed.join(", ")}</p>}
                                                        {addons.length > 0 && <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 font-medium">+ {addons.map((a:any) => a.name).join(", ")}</p>}
                                                        {item.observation && <div className="mt-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-100 dark:border-yellow-900/50 italic"><span className="font-bold not-italic mr-1">Obs:</span>{item.observation}</div>}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatCurrency(item.total_price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t dark:border-zinc-800 pt-4">
                        {(viewOrder.status === 'preparando' || viewOrder.status === 'aceito') ? (
                            <>
                                <Button variant="destructive" className="flex-1" onClick={() => handleCancelClick(viewOrder.id)}>Cancelar Pedido</Button>
                                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => moveOrder(viewOrder.id, 'enviado')}>
                                     {viewOrder.delivery_type === 'mesa' ? "SERVIR" : "PRONTO"}
                                </Button>
                            </>
                        ) : (
                             <Button className="w-full" variant="outline" onClick={() => setViewOrder(null)}>Fechar</Button>
                        )}
                    </DialogFooter>
                 </>
             )}
         </DialogContent>
      </Dialog>
    </div>
  )
}

function UtensilsIcon(props: any) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
    )
}
