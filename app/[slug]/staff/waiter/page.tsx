"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes" 
import { getStaffSession, logoutStaffAction } from "@/app/actions/staff"
import { 
    getTablesStatusAction, 
    getWaiterMenuAction,
    createTableOrderAction, 
    addItemsToTableAction, 
    closeTableAction 
} from "@/app/actions/waiter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Plus, Search, Minus, Utensils, Moon, Sun, CheckCircle2, RefreshCw, ChevronLeft, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// --- TIPAGENS ---
type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    category_id: string;
    image_url?: string;
    ingredients?: { id: string, name: string }[];
    addons?: { id: string, name: string, price: number }[];
}

type CartItem = Product & {
    cartId: string; // ID único para o carrinho (pois o mesmo produto pode ter obs diferentes)
    quantity: number;
    observation: string;
    removedIngredients: { id: string, name: string }[];
    selectedAddons: { id: string, name: string, price: number }[];
    totalPrice: number; // Preço unitário final (base + adicionais)
}

function WaiterContent({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [tables, setTables] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  
  // Estados de Navegação
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [isManagementOpen, setIsManagementOpen] = useState(false) // Modal da Mesa
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Modal do Cardápio
  const [productToCustomize, setProductToCustomize] = useState<Product | null>(null) // Modal de Customização
  
  // Estados do Carrinho / Seleção
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  // Estados de Customização do Produto
  const [tempQuantity, setTempQuantity] = useState(1)
  const [tempObs, setTempObs] = useState("")
  const [tempRemovedIngredients, setTempRemovedIngredients] = useState<string[]>([])
  const [tempSelectedAddons, setTempSelectedAddons] = useState<string[]>([])

  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // 1. Inicialização
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

  // 2. Polling de Mesas
  const fetchTables = async () => {
    if (!storeId) return
    try {
        const data = await getTablesStatusAction(storeId)
        setTables(data)
    } catch (error) {
        console.error("Erro mesas:", error)
    }
  }

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 5000)
    return () => clearInterval(interval)
  }, [storeId])

  // --- AÇÕES DE INTERFACE ---

  const openTableManagement = (table: any) => {
    setSelectedTable(table)
    setIsManagementOpen(true)
  }

  const openMenu = () => {
    setCart([]) 
    setSearchQuery("")
    setIsMenuOpen(true)
    setIsManagementOpen(false) 
  }

  const handleSelectProduct = (product: Product) => {
    // Reseta estados de customização
    setTempQuantity(1)
    setTempObs("")
    setTempRemovedIngredients([])
    setTempSelectedAddons([])
    setProductToCustomize(product)
  }

  const confirmAddItem = () => {
    if (!productToCustomize) return;

    // Calcula preço final unitário (Base + Adicionais)
    const addonsTotal = tempSelectedAddons.reduce((acc, addonId) => {
        const addon = productToCustomize.addons?.find(a => a.id === addonId)
        return acc + (addon?.price || 0)
    }, 0)
    const finalUnitPrice = Number(productToCustomize.price) + addonsTotal

    // Monta objetos completos para salvar
    const removedObjects = productToCustomize.ingredients
        ?.filter(i => tempRemovedIngredients.includes(i.id)) || []
    
    const addonObjects = productToCustomize.addons
        ?.filter(a => tempSelectedAddons.includes(a.id)) || []

    const newItem: CartItem = {
        ...productToCustomize,
        cartId: Math.random().toString(36).substr(2, 9),
        quantity: tempQuantity,
        observation: tempObs,
        removedIngredients: removedObjects,
        selectedAddons: addonObjects,
        totalPrice: finalUnitPrice * tempQuantity // Preço total deste item * quantidade
    }

    setCart(prev => [...prev, newItem])
    setProductToCustomize(null) // Fecha modal de customização
    toast({ title: "Item adicionado!", duration: 1000 })
  }

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
  }

  // --- ENVIO DO PEDIDO ---
  const sendOrder = () => {
    if (cart.length === 0) return
    
    startTransition(async () => {
      let res;
      try {
          if (selectedTable.status === 'free') {
            res = await createTableOrderAction(storeId!, selectedTable.id, cart)
          } else {
            res = await addItemsToTableAction(selectedTable.orderId, cart, selectedTable.total)
          }

          if (res?.success) {
            toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" })
            setIsMenuOpen(false)
            fetchTables()
          } else {
            toast({ 
                title: "Falha ao enviar", 
                description: res?.error || "Erro desconhecido.", 
                variant: "destructive" 
            })
          }
      } catch (err) {
          toast({ title: "Erro de Conexão", variant: "destructive" })
      }
    })
  }

  const handleCloseTable = async () => {
    if(!confirm("Liberar mesa? Certifique-se que o pagamento foi feito.")) return;
    if (!selectedTable?.orderId) return

    startTransition(async () => {
        const res = await closeTableAction(selectedTable.orderId, slug)
        if (res?.success) {
            setIsManagementOpen(false)
            fetchTables()
            toast({ title: "Mesa Liberada!", className: "bg-blue-600 text-white" })
        } else {
            toast({ title: "Erro", description: res?.error, variant: "destructive" })
        }
    })
  }

  // --- HELPERS VISUAIS ---
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeTab === "all" || p.category_id === activeTab
    return matchSearch && matchCat
  })

  // Calcula total do modal de customização em tempo real
  const currentItemTotal = useMemo(() => {
    if (!productToCustomize) return 0;
    const addonsPrice = tempSelectedAddons.reduce((acc, id) => {
        const a = productToCustomize.addons?.find(ad => ad.id === id);
        return acc + (a?.price || 0);
    }, 0);
    return (Number(productToCustomize.price) + addonsPrice) * tempQuantity;
  }, [productToCustomize, tempSelectedAddons, tempQuantity]);

  const cartTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <User className="text-primary" /> Garçom
        </h1>
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => fetchTables()}>
                <RefreshCw className="w-4 h-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logoutStaffAction(slug)}>
                <LogOut className="w-5 h-5 text-red-400" />
            </Button>
        </div>
      </header>

      {/* GRID DE MESAS */}
      <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.length === 0 && <p className="col-span-full text-center text-muted-foreground">Carregando mesas...</p>}
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => openTableManagement(table)}
            className={`
              h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 shadow-sm relative overflow-hidden transition-all active:scale-95
              ${table.status === 'free' 
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-slate-400' 
                : table.orderStatus === 'pronto_cozinha'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700'
              }
            `}
          >
            <span className="text-3xl font-bold">{table.id}</span>
            <div className="mt-2 text-center">
                 {table.status === 'free' ? (
                     <Badge variant="secondary" className="text-[10px] opacity-70">LIVRE</Badge>
                 ) : (
                     <div className="flex flex-col">
                        <span className="text-xs font-bold">R$ {table.total.toFixed(0)}</span>
                        {table.orderStatus === 'pronto_cozinha' && <span className="text-[10px] text-green-600 font-bold animate-pulse">PRONTO!</span>}
                     </div>
                 )}
            </div>
          </div>
        ))}
      </main>

      {/* 1. MODAL DETALHES DA MESA */}
      <Dialog open={isManagementOpen} onOpenChange={setIsManagementOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
            <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                    <span>Mesa {selectedTable?.id}</span>
                    <Badge variant={selectedTable?.status === 'free' ? "outline" : "default"}>
                        {selectedTable?.status === 'free' ? "Livre" : "Ocupada"}
                    </Badge>
                </DialogTitle>
            </DialogHeader>
            
            <div className="py-2">
                {selectedTable?.status === 'free' ? (
                    <div className="text-center py-6 space-y-4">
                        <Utensils className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
                        <Button className="w-full h-12 text-lg" onClick={openMenu}>
                            <Plus className="mr-2 h-5 w-5"/> Abrir Pedido
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <div className="border rounded-lg p-3 max-h-[250px] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">Consumo</p>
                            {selectedTable?.items?.length > 0 ? (
                                <ul className="space-y-3">
                                    {selectedTable.items.map((item: any, i: number) => (
                                        <li key={i} className="text-sm border-b border-dashed pb-2 last:border-0">
                                            <div className="flex justify-between font-medium">
                                                <span>{item.quantity}x {item.name || item.product_name}</span>
                                                <span>R$ {((item.price || item.unit_price) * item.quantity).toFixed(2)}</span>
                                            </div>
                                            {/* Mostra detalhes se tiver (banco retorna json) */}
                                            {/* Simplificado para visualização rápida */}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-xs italic text-muted-foreground">Vazio.</p>}
                         </div>

                         <div className="flex justify-between items-center text-lg font-bold">
                             <span>Total:</span>
                             <span>R$ {selectedTable?.total?.toFixed(2)}</span>
                         </div>

                         <div className="grid grid-cols-2 gap-3 pt-2">
                             <Button variant="outline" className="h-12" onClick={openMenu}>
                                <Plus className="mr-2 h-4 w-4"/> Adicionar
                             </Button>
                             <Button variant="destructive" className="h-12" onClick={handleCloseTable} disabled={isPending}>
                                {isPending ? <RefreshCw className="animate-spin"/> : <CheckCircle2 className="mr-2"/>} Liberar
                             </Button>
                         </div>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>

      {/* 2. MODAL CARDÁPIO (SELEÇÃO) */}
      <Dialog open={isMenuOpen} onOpenChange={(open) => {
          if(!open) setIsManagementOpen(true) // Volta pra mesa ao fechar
          setIsMenuOpen(open)
      }}>
        <DialogContent className="h-[95vh] w-full max-w-lg flex flex-col p-0 gap-0">
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
               <DialogTitle>Cardápio (Mesa {selectedTable?.id})</DialogTitle>
               <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>Voltar</Button>
            </div>

            <div className="p-2 space-y-2 border-b bg-white dark:bg-slate-950">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar..." 
                        className="pl-8 h-9" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
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
                            <div className="font-semibold text-sm">{p.name}</div>
                            <div className="text-emerald-600 font-bold text-xs">R$ {Number(p.price).toFixed(2)}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800"><Plus className="w-4 h-4"/></Button>
                    </div>
                    ))}
                </div>
            </ScrollArea>

            {/* CARRINHO NO RODAPÉ */}
            {cart.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t p-3 shadow-lg z-20">
                    <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => {
                        // Poderia abrir detalhes do carrinho aqui
                    }}>
                        <span className="font-bold text-sm">{cart.length} itens</span>
                        <span className="font-bold text-emerald-600">Total: R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Lista rápida de itens no carrinho */}
                    <div className="max-h-[100px] overflow-y-auto mb-2 text-xs space-y-1">
                        {cart.map((item) => (
                             <div key={item.cartId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-1 rounded px-2">
                                <span>{item.quantity}x {item.name}</span>
                                <div className="flex items-center gap-2">
                                    <span>R$ {item.totalPrice.toFixed(2)}</span>
                                    <Trash2 className="w-3 h-3 text-red-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeFromCart(item.cartId) }}/>
                                </div>
                             </div>
                        ))}
                    </div>

                    <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white" onClick={sendOrder} disabled={isPending}>
                        {isPending ? "Enviando..." : "CONFIRMAR PEDIDO"}
                    </Button>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* 3. MODAL DE CUSTOMIZAÇÃO DO PRODUTO */}
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
                            
                            {/* Ingredientes (Remover) */}
                            {productToCustomize.ingredients && productToCustomize.ingredients.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Ingredientes</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {productToCustomize.ingredients.map(ing => {
                                            const isRemoved = tempRemovedIngredients.includes(ing.id)
                                            return (
                                                <div key={ing.id} className="flex items-center space-x-2 border rounded p-2">
                                                    <Checkbox 
                                                        id={`ing-${ing.id}`} 
                                                        checked={!isRemoved}
                                                        onCheckedChange={(checked) => {
                                                            if (!checked) setTempRemovedIngredients(prev => [...prev, ing.id])
                                                            else setTempRemovedIngredients(prev => prev.filter(id => id !== ing.id))
                                                        }}
                                                    />
                                                    <label htmlFor={`ing-${ing.id}`} className={`text-sm cursor-pointer ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>
                                                        {ing.name}
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Adicionais (Selecionar) */}
                            {productToCustomize.addons && productToCustomize.addons.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Adicionais</h4>
                                    <div className="space-y-2">
                                        {productToCustomize.addons.map(addon => {
                                            const isSelected = tempSelectedAddons.includes(addon.id)
                                            return (
                                                <div key={addon.id} className={`flex items-center justify-between border rounded p-3 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                                     onClick={() => {
                                                         if (isSelected) setTempSelectedAddons(prev => prev.filter(id => id !== addon.id))
                                                         else setTempSelectedAddons(prev => [...prev, addon.id])
                                                     }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={isSelected} id={`add-${addon.id}`} />
                                                        <span className="text-sm font-medium">{addon.name}</span>
                                                    </div>
                                                    <span className="text-sm text-emerald-600 font-bold">+ R$ {Number(addon.price).toFixed(2)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Observação */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Observações</h4>
                                <Textarea 
                                    placeholder="Ex: Bem passado, sem sal, cortar ao meio..." 
                                    value={tempObs}
                                    onChange={e => setTempObs(e.target.value)}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer de Ação */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t shadow-lg z-10">
                         <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center border rounded-md">
                                 <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setTempQuantity(q => Math.max(1, q - 1))}><Minus className="w-4 h-4"/></Button>
                                 <span className="w-8 text-center font-bold">{tempQuantity}</span>
                                 <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setTempQuantity(q => q + 1)}><Plus className="w-4 h-4"/></Button>
                             </div>
                             <div className="text-right">
                                 <p className="text-xs text-muted-foreground">Total do Item</p>
                                 <p className="text-xl font-bold text-emerald-600">R$ {currentItemTotal.toFixed(2)}</p>
                             </div>
                         </div>
                         <Button className="w-full h-12 text-lg font-bold" onClick={confirmAddItem}>
                             Adicionar ao Pedido
                         </Button>
                    </div>
                 </>
             )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WaiterPageWrapper({ params }: { params: { slug: string } }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="waiter-theme">
            <WaiterContent params={params} />
        </ThemeProvider>
    )
}
