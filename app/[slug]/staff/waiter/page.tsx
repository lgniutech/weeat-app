"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes" 
import { getStaffSession, logoutStaffAction, validateStaffPin } from "@/app/actions/staff"
import { 
    getTablesStatusAction, 
    getWaiterMenuAction,
    createTableOrderAction, 
    addItemsToTableAction, 
    closeTableAction,
    serveReadyOrdersAction,
    serveBarItemsAction,
    validateCouponUiAction
} from "@/app/actions/waiter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Plus, Search, Minus, Utensils, Moon, Sun, CheckCircle2, RefreshCw, ChevronLeft, Trash2, BellRing, Phone, Receipt, CreditCard, TicketPercent, Tag, AlertTriangle, Lock, CupSoda, HandPlatter, Beer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatPhone, formatOnlyLetters } from "@/lib/utils"

type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    category_id: string;
    image_url?: string;
    send_to_kitchen?: boolean;
    ingredients?: { id: string, name: string }[];
    addons?: { id: string, name: string, price: number }[];
}

type CartItem = Product & {
    cartId: string;
    quantity: number;
    observation: string;
    removedIngredients: { id: string, name: string }[];
    selectedAddons: { id: string, name: string, price: number }[];
    totalPrice: number;
}

function WaiterContent({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [tables, setTables] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [isManagementOpen, setIsManagementOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [productToCustomize, setProductToCustomize] = useState<Product | null>(null)
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pinCode, setPinCode] = useState("")
  const [pinError, setPinError] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")

  const [tempQuantity, setTempQuantity] = useState(1)
  const [tempObs, setTempObs] = useState("")
  const [tempRemovedIngredients, setTempRemovedIngredients] = useState<string[]>([])
  const [tempSelectedAddons, setTempSelectedAddons] = useState<string[]>([])

  const [cartCoupon, setCartCoupon] = useState("")
  const [validatedCouponData, setValidatedCouponData] = useState<{valid: boolean, discount: number, message?: string} | null>(null)

  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    async function init() {
      const session = await getStaffSession()
      if (!session || session.storeSlug !== slug || session.role !== 'waiter') {
        router.push(`/${slug}/staff`)
        return
      }
      setStoreId(session.storeId)
      const cats = await getWaiterMenuAction(session.storeId)
      setCategories(cats)
      const allProds = cats.flatMap((c: any) => c.products || [])
      setProducts(allProds)
    }
    init()
  }, [slug, router])

  const fetchTables = useCallback(async () => {
    if (!storeId) return
    try {
        const data = await getTablesStatusAction(storeId)
        setTables(data)
        
        if (isManagementOpen) {
            setSelectedTable((currentSelected: any) => {
                if (!currentSelected) return null;
                const updated = data.find(t => t.id === currentSelected.id)
                return updated || null;
            })
        }
    } catch (error) { console.error(error) }
  }, [storeId, isManagementOpen])

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 3000) 
    return () => clearInterval(interval)
  }, [fetchTables])

  const openTableManagement = (table: any) => {
    setSelectedTable(table)
    if (table.status === 'free') {
        setClientName("")
        setClientPhone("")
    }
    setIsManagementOpen(true)
  }

  const openMenu = () => {
    setCart([]) 
    setSearchQuery("")
    setCartCoupon("") 
    setValidatedCouponData(null)
    setIsMenuOpen(true)
    setIsManagementOpen(false) 
  }

  const handleSelectProduct = (product: Product) => {
    setTempQuantity(1)
    setTempObs("")
    setTempRemovedIngredients([])
    setTempSelectedAddons([])
    setProductToCustomize(product)
  }

  const confirmAddItem = () => {
    if (!productToCustomize) return;
    const addonsTotal = tempSelectedAddons.reduce((acc, addonId) => {
        const addon = productToCustomize.addons?.find(a => a.id === addonId)
        return acc + (addon?.price || 0)
    }, 0)
    const finalUnitPrice = Number(productToCustomize.price) + addonsTotal
    const removedObjects = productToCustomize.ingredients?.filter(i => tempRemovedIngredients.includes(i.id)) || []
    const addonObjects = productToCustomize.addons?.filter(a => tempSelectedAddons.includes(a.id)) || []
    const newItem: CartItem = {
        ...productToCustomize,
        cartId: Math.random().toString(36).substr(2, 9),
        quantity: tempQuantity,
        observation: tempObs,
        removedIngredients: removedObjects,
        selectedAddons: addonObjects,
        totalPrice: finalUnitPrice * tempQuantity
    }
    setCart(prev => [...prev, newItem])
    setProductToCustomize(null)
    if (validatedCouponData) setValidatedCouponData(null) 
    toast({ title: "Adicionado ao carrinho" })
  }

  const removeFromCart = (cartId: string) => {
      setCart(prev => prev.filter(i => i.cartId !== cartId))
      setValidatedCouponData(null)
  }

  const handleValidateCartCoupon = async () => {
      if(!cartCoupon.trim()) return;
      const total = cart.reduce((acc, item) => acc + item.totalPrice, 0);
      
      const res = await validateCouponUiAction(storeId!, cartCoupon, total);
      if(res.valid) {
          setValidatedCouponData({ valid: true, discount: res.discount })
          toast({ title: "Cupom Válido!", description: `- R$ ${res.discount?.toFixed(2)}`, className: "bg-green-600 text-white" })
      } else {
          setValidatedCouponData({ valid: false, discount: 0, message: res.message })
          toast({ title: "Inválido", description: res.message, variant: "destructive" })
      }
  }

  const sendOrder = () => {
    if (cart.length === 0) return
    startTransition(async () => {
      try {
          let res;
          const codeToSend = cartCoupon.trim().toUpperCase();

          if (selectedTable.status === 'free') {
            res = await createTableOrderAction(storeId!, selectedTable.id, cart, clientName, clientPhone, codeToSend)
          } else {
            res = await addItemsToTableAction(selectedTable.orderId, cart, selectedTable.total, codeToSend)
          }
          if (res?.success) {
            toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" })
            setIsMenuOpen(false)
            fetchTables()
          } else {
            toast({ title: "Falha ao enviar", description: res?.error, variant: "destructive" })
          }
      } catch (err) { toast({ title: "Erro de Conexão", variant: "destructive" }) }
    })
  }

  const handleCloseTableAttempt = async () => {
      if(!confirm("Deseja realmente solicitar o encerramento da mesa?")) return;

      // Verifica se há itens pendentes (Cozinha ou Bar)
      if (selectedTable.isPreparing || selectedTable.hasReadyItems || selectedTable.hasBarItems) {
          setPinCode("");
          setPinError(false);
          setIsPinDialogOpen(true);
      } else {
          await executeCloseTable(false); 
      }
  }

  const handlePinConfirm = async () => {
      if (!pinCode || pinCode.length < 4) {
          setPinError(true);
          return;
      }

      const isValid = await validateStaffPin(storeId!, pinCode);
      if (isValid) {
          setIsPinDialogOpen(false);
          await executeCloseTable(true);
      } else {
          setPinError(true);
          toast({ title: "PIN Inválido", variant: "destructive" });
      }
  }

  const executeCloseTable = async (isForced: boolean) => {
    startTransition(async () => {
        const res = await closeTableAction(selectedTable.id, storeId!, isForced)
        if (res?.success) {
            setIsManagementOpen(false)
            if (isForced) {
                toast({ title: "Mesa Encerrada (Desistência)", description: "Itens cancelados.", className: "bg-red-600 text-white" })
            } else {
                toast({ title: "Mesa Encerrada!", className: "bg-green-600 text-white" })
            }
            fetchTables()
        } else {
            toast({ title: "Erro", description: res?.error, variant: "destructive" })
        }
    })
  }

  const handleServeKitchenOrders = async () => {
      if (!selectedTable?.readyOrderIds || selectedTable.readyOrderIds.length === 0) return;
      startTransition(async () => {
          const res = await serveReadyOrdersAction(selectedTable.readyOrderIds);
          if (res?.success) {
              toast({ title: "Cozinha Entregue!", className: "bg-green-600 text-white" });
              fetchTables(); 
          } else {
              toast({ title: "Erro", description: res?.error, variant: "destructive" });
          }
      });
  }

  const handleServeBarItems = async () => {
      if (!selectedTable?.barItemIds || selectedTable.barItemIds.length === 0) return;
      startTransition(async () => {
          const res = await serveBarItemsAction(selectedTable.barItemIds);
          if (res?.success) {
              toast({ title: "Itens de Bar/Copa Entregues!", className: "bg-blue-600 text-white" });
              fetchTables(); 
          } else {
              toast({ title: "Erro", description: res?.error, variant: "destructive" });
          }
      });
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeTab === "all" || p.category_id === activeTab
    return matchSearch && matchCat
  })

  const currentItemTotal = useMemo(() => {
    if (!productToCustomize) return 0;
    const addonsPrice = tempSelectedAddons.reduce((acc, id) => {
        const a = productToCustomize.addons?.find(ad => ad.id === id);
        return acc + (a?.price || 0);
    }, 0);
    return (Number(productToCustomize.price) + addonsPrice) * tempQuantity;
  }, [productToCustomize, tempSelectedAddons, tempQuantity]);

  const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const finalCartTotal = validatedCouponData?.valid ? cartTotal - validatedCouponData.discount : cartTotal;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <User className="text-primary" /> Garçom
        </h1>
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => fetchTables()}><RefreshCw className="w-4 h-4 text-slate-500" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logoutStaffAction(slug)}><LogOut className="w-5 h-5 text-red-400" /></Button>
        </div>
      </header>

      <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.length === 0 && <p className="col-span-full text-center text-muted-foreground">Carregando mesas...</p>}
        {tables.map(table => {
            const isReady = table.hasReadyItems;
            const isBarPending = table.hasBarItems;
            
            let statusLabel = "Servido";
            if(table.isPreparing) statusLabel = "Preparando...";

            let cardClasses = "";
            let kitchenIcon = null;
            let barIcon = null;

            if (table.status === 'free') {
                 cardClasses = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-slate-400";
            } else if (isReady) {
                 // PRIORIDADE VISUAL: Cozinha pronta ganha destaque VERDE
                 cardClasses = "bg-green-50 dark:bg-green-900/30 border-green-500 ring-2 ring-green-300 dark:ring-green-900 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 text-green-700 animate-pulse";
                 kitchenIcon = <div className="absolute top-2 right-2 animate-bounce"><BellRing className="w-6 h-6 text-green-600 fill-green-200" /></div>;
                 if(isBarPending) barIcon = <div className="absolute top-2 left-2"><CupSoda className="w-5 h-5 text-blue-600" /></div>;

            } else if (isBarPending) {
                 // PRIORIDADE SECUNDÁRIA: Bar pendente (sem cozinha pronta) ganha destaque AZUL
                 cardClasses = "bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-1 ring-blue-300 dark:ring-blue-900 text-blue-700";
                 barIcon = <div className="absolute top-2 right-2 animate-bounce"><CupSoda className="w-6 h-6 text-blue-600" /></div>;
            } else {
                 cardClasses = "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-400";
            }

            return (
              <div 
                key={table.id}
                onClick={() => openTableManagement(table)}
                className={cn(
                  "h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 shadow-sm relative overflow-hidden transition-all active:scale-95",
                  cardClasses
                )}
              >
                {kitchenIcon}
                {barIcon}

                <span className="text-3xl font-bold">{table.id}</span>
                <div className="mt-2 text-center">
                    {table.status === 'free' ? (
                        <Badge variant="secondary" className="text-[10px] opacity-70">LIVRE</Badge>
                    ) : (
                        <div className="flex flex-col items-center">
                            {isReady ? (
                                <span className="text-xs font-black bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full uppercase">COZINHA PRONTA!</span>
                            ) : isBarPending ? (
                                <span className="text-xs font-black bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full uppercase">RETIRAR BEBIDA</span>
                            ) : (
                                <>
                                    {table.discount > 0 && (
                                        <span className="text-[10px] line-through text-muted-foreground">R$ {table.subtotal?.toFixed(0)}</span>
                                    )}
                                    <span className="text-xs font-bold">R$ {table.total.toFixed(0)}</span>
                                    
                                    <span className={cn("text-[10px] font-medium uppercase mt-1", table.isPreparing ? "text-blue-600 animate-pulse" : "text-slate-500")}>
                                        {statusLabel}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
              </div>
            )
        })}
      </main>

      <Dialog open={isManagementOpen} onOpenChange={setIsManagementOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
            <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        Mesa {selectedTable?.id}
                        {selectedTable?.status !== 'free' && selectedTable?.customerName && !selectedTable.customerName.includes("Mesa") && (
                            <span className="text-sm font-normal text-muted-foreground">({selectedTable.customerName})</span>
                        )}
                    </span>
                    <Badge variant={selectedTable?.status === 'free' ? "outline" : "default"}>
                        {selectedTable?.status === 'free' ? "Livre" : "Ocupada"}
                    </Badge>
                </DialogTitle>
                <DialogDescription className="hidden">Gerenciamento da Mesa</DialogDescription>
            </DialogHeader>
            
            <div className="py-2 space-y-4">
                
                {/* BLOCO 1: Alerta da Cozinha (Prioridade Máxima) */}
                {selectedTable?.hasReadyItems && (
                    <div className="bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500 p-4 rounded-r shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 mb-3">
                            <BellRing className="w-6 h-6 text-green-700 dark:text-green-400 animate-bounce" />
                            <div>
                                <h3 className="font-bold text-green-800 dark:text-green-300">Cozinha Pronta!</h3>
                                <p className="text-xs text-green-700 dark:text-green-400">Leve os pratos à mesa.</p>
                            </div>
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg shadow-md transition-all active:scale-95" onClick={handleServeKitchenOrders} disabled={isPending}>
                            {isPending ? <RefreshCw className="animate-spin mr-2"/> : <CheckCircle2 className="mr-2 h-5 w-5"/>}
                            SERVIR COZINHA
                        </Button>
                    </div>
                )}

                {/* BLOCO 2: Alerta do Bar (Prioridade Secundária) */}
                {selectedTable?.hasBarItems && (
                    <div className="bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500 p-4 rounded-r shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 mb-3">
                            <CupSoda className="w-6 h-6 text-blue-700 dark:text-blue-400 animate-pulse" />
                            <div>
                                <h3 className="font-bold text-blue-800 dark:text-blue-300">Retirar no Balcão</h3>
                                <p className="text-xs text-blue-700 dark:text-blue-400">Bebidas/Itens prontos para entrega.</p>
                                {/* Lista rápida de itens para facilitar a visualização */}
                                <div className="text-xs text-blue-900 dark:text-blue-200 mt-1 font-mono">
                                    {selectedTable.items
                                        .filter((i:any) => i.send_to_kitchen === false && i.status !== 'entregue' && i.status !== 'cancelado')
                                        .map((i:any) => `${i.quantity}x ${i.name}`)
                                        .join(", ")}
                                </div>
                            </div>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg shadow-md transition-all active:scale-95" onClick={handleServeBarItems} disabled={isPending}>
                            {isPending ? <RefreshCw className="animate-spin mr-2"/> : <CheckCircle2 className="mr-2 h-5 w-5"/>}
                            CONFIRMAR ENTREGA
                        </Button>
                    </div>
                )}

                {selectedTable?.status === 'free' ? (
                    <div className="py-2 space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground uppercase">Nome do Cliente (Opcional)</Label>
                                <div className="relative">
                                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="client-name" 
                                        placeholder="Ex: João Silva" 
                                        className="pl-9 bg-white dark:bg-slate-900" 
                                        value={clientName} 
                                        onChange={(e) => setClientName(formatOnlyLetters(e.target.value))} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="client-phone" className="text-xs font-semibold text-muted-foreground uppercase">Telefone / WhatsApp</Label>
                                <div className="relative">
                                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="client-phone" 
                                        placeholder="Ex: 11999999999" 
                                        className="pl-9 bg-white dark:bg-slate-900" 
                                        value={clientPhone} 
                                        onChange={(e) => setClientPhone(formatPhone(e.target.value))} 
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        </div>
                        <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90" onClick={openMenu}>
                            <Plus className="mr-2 h-5 w-5"/> Abrir Pedido
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed">
                                 <span className="text-xs font-bold text-muted-foreground uppercase">Conta Final</span>
                                 <div className="text-right">
                                    {selectedTable?.discount > 0 && (
                                        <div className="text-[10px] text-muted-foreground line-through">Sub: R$ {selectedTable.subtotal?.toFixed(2)}</div>
                                    )}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">R$ {selectedTable?.total?.toFixed(2)}</span>
                                 </div>
                            </div>

                            {selectedTable?.items?.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedTable.items.map((item: any, i: number) => {
                                        let removed = [];
                                        let addons = [];
                                        try {
                                            removed = typeof item.removed_ingredients === 'string' ? JSON.parse(item.removed_ingredients) : item.removed_ingredients || [];
                                            addons = typeof item.selected_addons === 'string' ? JSON.parse(item.selected_addons) : item.selected_addons || [];
                                        } catch(e) {}

                                        const isDelivered = item.status === 'entregue' || item.status === 'concluido';
                                        
                                        return (
                                            <li key={i} className="text-sm border-b border-dashed pb-2 last:border-0 flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-1">
                                                        {isDelivered ? (
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                        ) : item.send_to_kitchen === false ? (
                                                            <CupSoda className="w-3 h-3 text-blue-500 animate-pulse" />
                                                        ) : (
                                                            <div className="w-3 h-3 rounded-full border border-slate-300" />
                                                        )}
                                                        <span className={cn("truncate max-w-[150px] font-medium", isDelivered && "text-muted-foreground")}>
                                                            {item.quantity}x {item.name || item.product_name}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs">R$ {((item.price || item.unit_price) * item.quantity).toFixed(2)}</span>
                                                </div>
                                                
                                                <div className="text-xs text-muted-foreground pl-4 space-y-0.5 mt-1">
                                                    {removed.length > 0 && (
                                                        <div className="text-red-500/80">
                                                            Sem: {removed.map((r: any) => r.name).join(", ")}
                                                        </div>
                                                    )}
                                                    {addons.length > 0 && (
                                                        <div className="text-green-600/80">
                                                            Add: {addons.map((a: any) => `${a.name} (+R$ ${Number(a.price).toFixed(2)})`).join(", ")}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : <p className="text-xs italic text-muted-foreground">Vazio.</p>}
                         </div>

                         {selectedTable?.couponCode && (
                             <div className="text-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 py-1 rounded">
                                 CUPOM ATIVO: {selectedTable.couponCode}
                             </div>
                         )}

                         <div className="grid grid-cols-2 gap-2 pt-2">
                             <Button variant="outline" className="h-12 col-span-2" onClick={openMenu}><Plus className="mr-2 h-4 w-4"/> Adicionar Mais Itens</Button>
                             
                             <Button 
                                className="h-12 col-span-2 font-bold shadow-sm bg-red-500 hover:bg-red-600 text-white"
                                onClick={handleCloseTableAttempt} 
                                disabled={isPending} 
                             >
                                <CreditCard className="mr-2 h-4 w-4"/> Encerrar / Receber
                             </Button>
                         </div>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
          <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                  <div className="flex items-center gap-2 text-amber-600">
                     <AlertTriangle className="w-6 h-6" />
                     <DialogTitle>Mesa em Preparo!</DialogTitle>
                  </div>
                  <DialogDescription className="pt-2">
                      Existem pedidos na cozinha ou não servidos.
                      <br/>
                      Insira seu PIN para reportar <strong>Desistência</strong> e cancelar.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                  <Input 
                    type="password" 
                    placeholder="PIN" 
                    maxLength={4} 
                    className="text-center text-2xl tracking-[0.5em] font-bold"
                    value={pinCode}
                    onChange={(e) => { setPinCode(e.target.value); setPinError(false); }}
                  />
                  {pinError && <p className="text-xs text-red-500 mt-2 font-bold text-center">PIN incorreto.</p>}
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsPinDialogOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handlePinConfirm} disabled={isPending}>Confirmar Cancelamento</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
       <Dialog open={isMenuOpen} onOpenChange={(open) => { if(!open) setIsManagementOpen(true); setIsMenuOpen(open) }}>
        <DialogContent className="h-[95vh] w-full max-w-lg flex flex-col p-0 gap-0">
             <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
               <DialogTitle>Cardápio (Mesa {selectedTable?.id})</DialogTitle>
               <DialogDescription className="hidden">Cardápio da Mesa</DialogDescription>
               <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>Voltar</Button>
            </div>
            <div className="p-2 space-y-2 border-b bg-white dark:bg-slate-950">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-8 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                   <div className="flex gap-2">
                      <Button variant={activeTab === 'all' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('all')} className="rounded-full h-7 text-xs">Todos</Button>
                      {categories.map(c => (
                        <Button key={c.id} variant={activeTab === c.id ? "default" : "outline"} size="sm" onClick={() => setActiveTab(c.id)} className="rounded-full h-7 text-xs">{c.name}</Button>
                      ))}
                   </div>
                </ScrollArea>
            </div>
            <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900 p-2">
                <div className="grid grid-cols-1 gap-2 pb-20">
                    {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => handleSelectProduct(p)} className="bg-white dark:bg-slate-950 p-3 rounded-lg border flex justify-between items-center active:bg-slate-100 cursor-pointer shadow-sm">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-sm">{p.name}</div>
                                {p.send_to_kitchen === false && <CupSoda className="w-3 h-3 text-blue-500" />}
                            </div>
                            <div className="text-emerald-600 font-bold text-xs">R$ {Number(p.price).toFixed(2)}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800"><Plus className="w-4 h-4"/></Button>
                    </div>
                    ))}
                </div>
            </ScrollArea>
            
            {cart.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t p-3 shadow-lg z-20 space-y-3">
                    
                    <div className="flex gap-2">
                         <div className="relative flex-1">
                             <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input 
                                placeholder="Cupom de desconto" 
                                className="pl-9 uppercase" 
                                value={cartCoupon}
                                onChange={(e) => { setCartCoupon(e.target.value); setValidatedCouponData(null); }}
                             />
                         </div>
                         <Button variant="secondary" onClick={handleValidateCartCoupon}>Aplicar</Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-500">{cart.length} itens</span>
                        <div className="text-right">
                             {validatedCouponData?.valid && (
                                 <span className="text-xs text-green-600 block">Desconto: -R$ {validatedCouponData.discount.toFixed(2)}</span>
                             )}
                             <span className="font-bold text-emerald-600 text-lg">Total: R$ {finalCartTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white" onClick={sendOrder} disabled={isPending}>
                        {isPending ? "Enviando..." : "CONFIRMAR PEDIDO"}
                    </Button>
                </div>
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!productToCustomize} onOpenChange={(o) => !o && setProductToCustomize(null)}>
        <DialogContent className="h-[90vh] sm:h-auto sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden">
             {productToCustomize && (
                 <>
                    <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setProductToCustomize(null)}><ChevronLeft className="w-5 h-5"/></Button>
                        <div>
                            <DialogTitle className="text-base">{productToCustomize.name}</DialogTitle>
                            <DialogDescription className="text-xs truncate max-w-[200px]">{productToCustomize.description}</DialogDescription>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6 pb-10">
                             <div className="space-y-3">
                                <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Ingredientes</h4>
                                {productToCustomize.ingredients && productToCustomize.ingredients.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {productToCustomize.ingredients.map(ing => {
                                            const isRemoved = tempRemovedIngredients.includes(ing.id)
                                            return (
                                                <div key={ing.id} className="flex items-center space-x-2 border rounded p-2">
                                                    <Checkbox id={`ing-${ing.id}`} checked={!isRemoved} onCheckedChange={(checked) => { if (!checked) setTempRemovedIngredients(prev => [...prev, ing.id]); else setTempRemovedIngredients(prev => prev.filter(id => id !== ing.id)) }} />
                                                    <label htmlFor={`ing-${ing.id}`} className={`text-sm cursor-pointer ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>{ing.name}</label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : <p className="text-sm text-muted-foreground italic">Nenhum ingrediente removível.</p>}
                             </div>

                             <div className="space-y-3">
                                 <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Adicionais</h4>
                                 {productToCustomize.addons && productToCustomize.addons.length > 0 ? (
                                    <div className="space-y-2">
                                        {productToCustomize.addons.map(addon => {
                                            const isSelected = tempSelectedAddons.includes(addon.id)
                                            return (
                                                <div key={addon.id} className={`flex items-center justify-between border rounded p-3 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`} onClick={() => { if (isSelected) setTempSelectedAddons(prev => prev.filter(id => id !== addon.id)); else setTempSelectedAddons(prev => [...prev, addon.id]) }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{addon.name}</span>
                                                        <span className="text-xs text-emerald-600 font-bold">+ R$ {addon.price.toFixed(2)}</span>
                                                    </div>
                                                    {isSelected ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <div className="w-5 h-5 border-2 rounded-full border-slate-300" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                 ) : <p className="text-sm text-muted-foreground italic">Nenhum adicional disponível.</p>}
                             </div>

                             <div className="space-y-3">
                                <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Observação</h4>
                                <Textarea placeholder="Ex: Ponto da carne, sem sal..." value={tempObs} onChange={e => setTempObs(e.target.value)} />
                             </div>
                             <div className="space-y-3">
                                <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Quantidade</h4>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setTempQuantity(q => Math.max(1, q - 1))}><Minus className="w-4 h-4"/></Button>
                                    <span className="text-xl font-bold w-8 text-center">{tempQuantity}</span>
                                    <Button variant="outline" size="icon" onClick={() => setTempQuantity(q => q + 1)}><Plus className="w-4 h-4"/></Button>
                                </div>
                             </div>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
                        <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white" onClick={confirmAddItem}>
                            <CheckCircle2 className="mr-2 h-5 w-5"/> <span>Confirmar R$ {currentItemTotal.toFixed(2)}</span>
                        </Button>
                    </div>
                 </>
             )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WaiterPage({ params }: { params: { slug: string } }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="waiter-theme" disableTransitionOnChange>
            <WaiterContent params={params} />
        </ThemeProvider>
    )
}
