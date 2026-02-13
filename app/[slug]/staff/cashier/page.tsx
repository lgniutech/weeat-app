"use client"

import { useState, useEffect } from "react"
import { 
  getCashierDataAction, 
  closeTableAction, 
  deliverPickupOrderAction,
  cancelOrderAction,
  getStoreIdBySlug
} from "@/app/actions/cashier"
import { validateStaffPin } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input" 
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
  Trash2, DollarSign, CreditCard, Banknote, Smartphone, User, AlertTriangle, Lock
} from "lucide-react"

export default function CashierPage({ params }: { params: { slug: string } }) {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [data, setData] = useState<{ tables: any[], pickups: any[] }>({ tables: [], pickups: [] })
  const [isLoading, setIsLoading] = useState(true)
  
  // UI States
  const [activeTab, setActiveTab] = useState("tables")
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  
  // Modais de Pagamento e PIN
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("debit_card")
  const [isProcessing, setIsProcessing] = useState(false)

  // Estado para Confirmação com PIN
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinCode, setPinCode] = useState("")
  const [pinError, setPinError] = useState(false)

  const { toast } = useToast()

  // 1. Inicialização
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

  // 2. Loop de Atualização
  useEffect(() => {
    if (!storeId) return
    
    const loadData = async () => {
        const res = await getCashierDataAction(storeId)
        setData(res)
        setIsLoading(false)
    }

    loadData()
    const interval = setInterval(loadData, 5000) // 5s polling
    return () => clearInterval(interval)
  }, [storeId])

  const handleOpenTable = (table: any) => {
      setSelectedTable(table)
  }

  // Função para abrir o modal de pagamento (verifica pendências antes)
  const requestPayment = () => {
      if (!selectedTable) return;
      
      // Verifica se existem pedidos que NÃO estão entregues (pendente, aceito, preparando, pronto)
      const hasPendingOrders = selectedTable.orders.some((o: any) => 
        ['aceito', 'preparando', 'pronto', 'enviado'].includes(o.status)
      );

      // Se tiver pendência, abre o modal de PIN primeiro
      // Se não, abre direto o de pagamento
      // *NOTA: O modal de pagamento chamará handleCloseTable, que chamará o PIN se necessário.
      // Aqui simplificamos: o usuário clica em "Receber", abre modal de pgto.
      // Ao confirmar pgto no modal, verificamos pendências.
      setIsPaymentModalOpen(true);
  }

  const handleCloseTableAttempt = async () => {
      if (!storeId || !selectedTable) return

      // Verifica pendências
      const hasPendingOrders = selectedTable.orders.some((o: any) => 
        ['aceito', 'preparando', 'pronto', 'enviado'].includes(o.status)
      );

      if (hasPendingOrders) {
          // Fecha modal de pagamento e abre o de PIN
          setIsPaymentModalOpen(false)
          setPinCode("")
          setPinError(false)
          setIsPinModalOpen(true)
      } else {
          // Sem pendências, prossegue direto
          await executeCloseTable()
      }
  }

  const handlePinConfirm = async () => {
      if (!pinCode || pinCode.length < 4) {
          setPinError(true)
          return
      }

      setIsProcessing(true)
      const isValid = await validateStaffPin(storeId!, pinCode)
      
      if (isValid) {
          await executeCloseTable()
          setIsPinModalOpen(false)
      } else {
          setPinError(true)
          toast({ title: "Erro", description: "PIN inválido.", variant: "destructive" })
      }
      setIsProcessing(false)
  }

  const executeCloseTable = async () => {
      setIsProcessing(true)
      const result = await closeTableAction(storeId!, selectedTable.table_number, paymentMethod)
      
      if (result.success) {
          toast({ title: "Mesa Fechada", description: `Mesa ${selectedTable.table_number} liberada.` })
          setIsPaymentModalOpen(false)
          setSelectedTable(null)
          const res = await getCashierDataAction(storeId!)
          setData(res)
      } else {
          toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
      setIsProcessing(false)
  }

  const handleDeliverPickup = async (orderId: string) => {
      if (!confirm("Confirmar entrega deste pedido?")) return;
      const result = await deliverPickupOrderAction(orderId)
      if (result.success) {
          toast({ title: "Entregue", description: "Pedido marcado como entregue." })
          const res = await getCashierDataAction(storeId!)
          setData(res)
      } else {
           toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" })
      }
  }

  const handleCancelItem = async (orderId: string) => {
      if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
      await cancelOrderAction(orderId);
      
      if (selectedTable) {
        const updatedOrders = selectedTable.orders.filter((o: any) => o.id !== orderId);
        if (updatedOrders.length === 0) {
            setSelectedTable(null);
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

  const getCustomerName = (table: any) => {
      if (!table.customer_name) return null;
      if (table.customer_name.toLowerCase().includes("mesa")) return null;
      return table.customer_name;
  }

  const getPaymentIcon = (method: string) => {
      switch(method) {
          case 'pix': return <Smartphone className="w-3 h-3" />;
          case 'money': return <Banknote className="w-3 h-3" />;
          default: return <CreditCard className="w-3 h-3" />;
      }
  }

  const getPaymentLabel = (method: string) => {
      const labels: Record<string, string> = {
          'credit_card': 'Crédito', 'debit_card': 'Débito', 'pix': 'Pix', 'money': 'Dinheiro'
      }
      return labels[method] || method;
  }

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 pb-20 md:p-8 font-sans">
        
        {/* HEADER */}
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

        {/* TABS */}
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
                        {data.tables.map((table) => {
                            const clientName = getCustomerName(table);
                            // Checa se tem itens não entregues para aviso visual
                            const hasPending = table.orders.some((o: any) => ['aceito', 'preparando', 'pronto', 'enviado'].includes(o.status));
                            
                            return (
                                <Card 
                                    key={table.table_number} 
                                    className={`cursor-pointer hover:shadow-md transition-all group bg-white dark:bg-zinc-900 overflow-hidden relative ${hasPending ? 'border-orange-200 dark:border-orange-900' : 'hover:border-emerald-500'}`}
                                    onClick={() => handleOpenTable(table)}
                                >
                                    {/* Badge de Cliente */}
                                    {clientName && (
                                        <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold flex items-center gap-1">
                                            <User className="w-3 h-3" /> {clientName.split(' ')[0]}
                                        </div>
                                    )}

                                    {/* Indicador de Pendência */}
                                    {hasPending && !clientName && (
                                        <div className="absolute top-0 right-0 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold">
                                            Em Preparo
                                        </div>
                                    )}

                                    <CardHeader className="pb-2 pt-6">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="text-lg px-2 py-1 bg-slate-100 dark:bg-zinc-800 border-none group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                                                #{table.table_number}
                                            </Badge>
                                        </div>
                                        {clientName && (
                                            <p className="text-sm font-semibold truncate pt-1">{clientName}</p>
                                        )}
                                        {!clientName && (
                                            <CardDescription className="text-xs pt-1">Mesa {table.table_number}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(table.total)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                                            <span>{table.orders.length} pedidos</span>
                                            <span>{new Date(table.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </TabsContent>

            {/* ABA RETIRADA (Mantida igual) */}
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
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <Badge variant={order.status === 'pronto' ? 'default' : 'secondary'} className={order.status === 'pronto' ? 'bg-green-500' : ''}>
                                                    {order.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs font-mono font-bold">{formatCurrency(order.total_price)}</span>
                                                
                                                {order.payment_method && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-slate-100 dark:bg-zinc-800 border px-2 py-0.5 rounded-md ml-1">
                                                        {getPaymentIcon(order.payment_method)}
                                                        <span className="font-medium">{getPaymentLabel(order.payment_method)}</span>
                                                    </div>
                                                )}
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
                    <div className="flex justify-between items-start">
                        <div>
                            <SheetTitle className="text-2xl">Mesa {selectedTable?.table_number}</SheetTitle>
                            {selectedTable && getCustomerName(selectedTable) && (
                                <div className="mt-1 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                                    <User className="w-4 h-4" />
                                    <span>{selectedTable.customer_name}</span>
                                </div>
                            )}
                        </div>
                        <Badge variant="outline" className="bg-white dark:bg-black">
                            {selectedTable?.status === 'pagando' ? 'Pagando' : 'Ocupada'}
                        </Badge>
                    </div>
                    <SheetDescription>Conferência de itens antes do pagamento.</SheetDescription>
                </SheetHeader>
                
                {selectedTable && (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <div className="space-y-6">
                                {selectedTable.orders.map((order: any) => (
                                    <div key={order.id} className="relative pl-4 border-l-2 border-slate-200 dark:border-zinc-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground">Pedido #{order.id.slice(0,4)}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                                                    {/* Mostra status se não estiver entregue */}
                                                    {order.status !== 'entregue' && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{order.status}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-red-300 hover:text-red-500 hover:bg-red-50"
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

                        <SheetFooter className="p-6 bg-slate-50 dark:bg-zinc-900 border-t flex-col gap-4 sm:flex-col sm:space-x-0 flex-none">
                            <div className="flex justify-between w-full items-end">
                                <span className="text-muted-foreground text-sm">Total a Receber</span>
                                <span className="text-3xl font-bold text-emerald-600">{formatCurrency(selectedTable.total)}</span>
                            </div>
                            <Button size="lg" className="w-full font-bold" onClick={requestPayment}>
                                RECEBER E LIBERAR MESA
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>

        {/* MODAL DE PAGAMENTO */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Pagamento Mesa {selectedTable?.table_number}</DialogTitle>
                    <DialogDescription>
                        {selectedTable && getCustomerName(selectedTable) && (
                            <span className="block mb-2 font-bold text-black dark:text-white">Cliente: {selectedTable.customer_name}</span>
                        )}
                        Total: <span className="font-bold text-emerald-600 text-lg">{selectedTable && formatCurrency(selectedTable.total)}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a forma de pagamento:</p>
                    <div className="grid grid-cols-2 gap-4">
                        {['credit_card', 'debit_card', 'pix', 'money'].map((method) => (
                            <div 
                                key={method}
                                className={`flex flex-col items-center justify-center border-2 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-all ${paymentMethod === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                                onClick={() => setPaymentMethod(method)}
                            >
                                {method === 'pix' ? <Smartphone className="w-6 h-6 mb-2" /> : method === 'money' ? <Banknote className="w-6 h-6 mb-2" /> : <CreditCard className="w-6 h-6 mb-2" />}
                                <span className="text-xs font-bold uppercase">{method.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
                    {/* Botão confirma e tenta fechar (vai pro PIN se necessário) */}
                    <Button onClick={handleCloseTableAttempt} disabled={isProcessing} className="w-full sm:w-auto">
                        {isProcessing ? "Processando..." : "Confirmar Pagamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL DE CONFIRMAÇÃO COM PIN */}
        <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
             <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-6 h-6" />
                        <DialogTitle>Atenção!</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        Esta mesa possui pedidos que ainda estão <strong>na cozinha</strong> ou <strong>não foram servidos</strong>.
                        <br/><br/>
                        Deseja realmente continuar e fechar a mesa?
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4 text-muted-foreground"/>
                            Digite sua Chave de Acesso (PIN)
                        </label>
                        <Input 
                            type="password" 
                            placeholder="****" 
                            maxLength={4} 
                            className={`text-center text-2xl tracking-[0.5em] font-bold ${pinError ? 'border-red-500' : ''}`}
                            value={pinCode}
                            onChange={(e) => { setPinCode(e.target.value); setPinError(false); }}
                        />
                        {pinError && <p className="text-xs text-red-500 font-medium">PIN incorreto. Tente novamente.</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsPinModalOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handlePinConfirm} disabled={isProcessing}>
                        {isProcessing ? "Verificando..." : "Forçar Fechamento"}
                    </Button>
                </DialogFooter>
             </DialogContent>
        </Dialog>
    </div>
  )
}
