"use client"

import { useState, useEffect } from "react"
import { 
  getCashierDataAction, 
  closeTableAction, 
  deliverPickupOrderAction,
  cancelOrderAction,
  getStoreIdBySlug
} from "@/app/actions/cashier"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter 
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Loader2, RefreshCw, ShoppingBag, Utensils, 
  Trash2, DollarSign, CreditCard, Banknote, Smartphone 
} from "lucide-react"

export default function CashierPage({ params }: { params: { slug: string } }) {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [data, setData] = useState<{ tables: any[], pickups: any[] }>({ tables: [], pickups: [] })
  const [isLoading, setIsLoading] = useState(true)
  
  // UI States
  const [activeTab, setActiveTab] = useState("tables")
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("debit_card")
  const [isProcessing, setIsProcessing] = useState(false)

  const { toast } = useToast()

  // 1. Inicialização: Buscar StoreID pelo Slug da URL
  useEffect(() => {
    const init = async () => {
        const id = await getStoreIdBySlug(params.slug)
        if (id) {
            setStoreId(id)
        } else {
            toast({ title: "Erro", description: "Loja não encontrada", variant: "destructive" })
            setIsLoading(false)
        }
    }
    init()
  }, [params.slug, toast])

  // 2. Loop de Atualização (Polling) - Atualiza a cada 10s
  useEffect(() => {
    if (!storeId) return
    
    const loadData = async () => {
        const res = await getCashierDataAction(storeId)
        setData(res)
        setIsLoading(false)
    }

    loadData() // Primeira carga imediata
    const interval = setInterval(loadData, 10000) // Polling
    return () => clearInterval(interval)
  }, [storeId])

  // --- HANDLERS (Ações do Usuário) ---

  const handleOpenTable = (table: any) => {
      setSelectedTable(table)
  }

  const handleCloseTable = async () => {
      if (!storeId || !selectedTable) return
      setIsProcessing(true)
      
      const result = await closeTableAction(storeId, selectedTable.table_number, paymentMethod)
      
      if (result.success) {
          toast({ title: "Mesa Fechada", description: `Mesa ${selectedTable.table_number} liberada com sucesso.` })
          setIsPaymentModalOpen(false)
          setSelectedTable(null)
          // Atualiza dados na hora para refletir a mudança
          const res = await getCashierDataAction(storeId)
          setData(res)
      } else {
          toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
      setIsProcessing(false)
  }

  const handleDeliverPickup = async (orderId: string) => {
      // Confirmação simples do navegador para agilidade
      if (!confirm("Confirmar entrega deste pedido?")) return;
      
      const result = await deliverPickupOrderAction(orderId)
      if (result.success) {
          toast({ title: "Entregue", description: "Pedido marcado como entregue." })
          const res = await getCashierDataAction(storeId!)
          setData(res)
      } else {
           toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" })
      }
  }

  const handleCancelItem = async (orderId: string) => {
      if (!confirm("Tem certeza que deseja cancelar este pedido da mesa?")) return;
      await cancelOrderAction(orderId);
      
      // Atualiza visualização local instantaneamente antes do refresh
      if (selectedTable) {
        const updatedOrders = selectedTable.orders.filter((o: any) => o.id !== orderId);
        if (updatedOrders.length === 0) {
            setSelectedTable(null); // Fecha modal se não tiver mais itens
        } else {
            setSelectedTable({
                ...selectedTable,
                orders: updatedOrders,
                total: updatedOrders.reduce((acc: number, o: any) => acc + o.total_price, 0)
            });
        }
      }
      const res = await getCashierDataAction(storeId!);
      setData(res);
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 pb-20 md:p-8 font-sans">
        
        {/* HEADER DA PÁGINA */}
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <DollarSign className="w-8 h-8 text-emerald-600 bg-emerald-100 p-1.5 rounded-lg" />
                    Frente de Caixa
                </h1>
                <p className="text-muted-foreground">Gerencie pagamentos e retiradas.</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {/* CONTEÚDO PRINCIPAL (ABAS) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="tables" className="gap-2"><Utensils className="w-4 h-4" /> Mesas ({data.tables.length})</TabsTrigger>
                <TabsTrigger value="pickups" className="gap-2"><ShoppingBag className="w-4 h-4" /> Retirada ({data.pickups.length})</TabsTrigger>
            </TabsList>

            {/* ABA MESAS */}
            <TabsContent value="tables" className="space-y-4">
                {data.tables.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
                        <Utensils className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma mesa aberta no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {data.tables.map((table) => (
                            <Card 
                                key={table.table_number} 
                                className="cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group bg-white dark:bg-zinc-900"
                                onClick={() => handleOpenTable(table)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="text-lg px-2 py-1 bg-slate-100 dark:bg-zinc-800 border-none group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                                            #{table.table_number}
                                        </Badge>
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <CardDescription className="text-xs">
                                        {new Date(table.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                                        {formatCurrency(table.total)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {table.orders.length} pedidos
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>

            {/* ABA RETIRADA / BALCÃO */}
            <TabsContent value="pickups">
                 <div className="bg-white dark:bg-zinc-900 rounded-xl border shadow-sm overflow-hidden">
                    {data.pickups.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum pedido aguardando retirada.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {data.pickups.map((order) => (
                                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-orange-100 dark:bg-orange-900/20 p-2.5 rounded-full text-orange-600">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">#{order.id.slice(0,4)} - {order.customer_name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {order.order_items.map((i:any) => `${i.quantity}x ${i.product_name}`).join(", ")}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant={order.status === 'pronto' ? 'default' : 'secondary'} className={order.status === 'pronto' ? 'bg-green-500' : ''}>
                                                    {order.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs font-mono font-bold">{formatCurrency(order.total_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={() => handleDeliverPickup(order.id)}>Entregar</Button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </TabsContent>
        </Tabs>

        {/* GAVETA LATERAL: DETALHES DA MESA */}
        <Sheet open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0 h-full max-h-[100dvh]" side="right">
                <SheetHeader className="p-6 bg-slate-50 dark:bg-zinc-900 border-b flex-none">
                    <SheetTitle>Mesa {selectedTable?.table_number}</SheetTitle>
                    <SheetDescription>Conferência de itens antes do pagamento.</SheetDescription>
                </SheetHeader>
                
                {selectedTable && (
                    <>
                        {/* LISTA DE ITENS DA MESA */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <div className="space-y-6">
                                {selectedTable.orders.map((order: any) => (
                                    <div key={order.id} className="relative pl-4 border-l-2 border-slate-200 dark:border-zinc-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground">Pedido #{order.id.slice(0,4)}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                                            </div>
                                            {/* Botão de Cancelar Item Individual */}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-red-300 hover:text-red-500 hover:bg-red-50"
                                                title="Cancelar este pedido inteiro"
                                                onClick={() => handleCancelItem(order.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            {order.order_items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span>{item.quantity}x {item.product_name}</span>
                                                    <span className="font-mono text-muted-foreground">{formatCurrency(item.total_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RODAPÉ COM TOTAL E AÇÃO */}
                        <SheetFooter className="p-6 bg-slate-50 dark:bg-zinc-900 border-t flex-col gap-4 sm:flex-col sm:space-x-0 flex-none">
                            <div className="flex justify-between w-full items-end">
                                <span className="text-muted-foreground text-sm">Total a Receber</span>
                                <span className="text-3xl font-bold text-emerald-600">{formatCurrency(selectedTable.total)}</span>
                            </div>
                            <Button size="lg" className="w-full font-bold" onClick={() => setIsPaymentModalOpen(true)}>
                                RECEBER E LIBERAR MESA
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>

        {/* MODAL DE PAGAMENTO (TIPO POPUP) */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Pagamento Mesa {selectedTable?.table_number}</DialogTitle>
                    <DialogDescription>
                        Total: <span className="font-bold text-emerald-600">{selectedTable && formatCurrency(selectedTable.total)}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a forma de pagamento:</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            className={`flex flex-col items-center justify-center border-2 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-all ${paymentMethod === 'credit_card' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                            onClick={() => setPaymentMethod('credit_card')}
                        >
                            <CreditCard className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">Crédito</span>
                        </div>
                        <div 
                            className={`flex flex-col items-center justify-center border-2 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-all ${paymentMethod === 'debit_card' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                            onClick={() => setPaymentMethod('debit_card')}
                        >
                            <CreditCard className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">Débito</span>
                        </div>
                        <div 
                            className={`flex flex-col items-center justify-center border-2 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                            onClick={() => setPaymentMethod('pix')}
                        >
                            <Smartphone className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">PIX</span>
                        </div>
                        <div 
                            className={`flex flex-col items-center justify-center border-2 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-all ${paymentMethod === 'money' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                            onClick={() => setPaymentMethod('money')}
                        >
                            <Banknote className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">Dinheiro</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCloseTable} disabled={isProcessing} className="w-full sm:w-auto">
                        {isProcessing ? "Processando..." : "Confirmar Pagamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  )
}
