"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getStaffSession, logoutStaffAction } from "@/app/actions/staff"
import { getTablesStatusAction, createTableOrderAction, addItemsToTableAction, requestBillAction, closeTableAction } from "@/app/actions/waiter"
import { getCategoriesAction } from "@/app/actions/menu" // Reusando action de menu
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Plus, Search, DollarSign, CheckCircle2, ShoppingBag } from "lucide-react"

export default function WaiterPage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [tables, setTables] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  
  // Estado do Modal de Pedido
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [cart, setCart] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // 1. Auth & Init
  useEffect(() => {
    async function init() {
      const session = await getStaffSession()
      if (!session || session.storeSlug !== slug || session.role !== 'waiter') {
        router.push(`/${slug}/staff`)
        return
      }
      setStoreId(session.storeId)
      
      // Carrega cardápio para lançamento
      const cats = await getCategoriesAction(session.storeId)
      setCategories(cats)
      // Achata produtos das categorias
      const allProds = cats.flatMap((c: any) => c.products || []).filter((p: any) => p.is_available)
      setProducts(allProds)
    }
    init()
  }, [slug, router])

  // 2. Polling das Mesas
  const fetchTables = async () => {
    if (!storeId) return
    const data = await getTablesStatusAction(storeId)
    setTables(data)
  }

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 10000)
    return () => clearInterval(interval)
  }, [storeId])

  // --- LÓGICA DE PEDIDO ---
  const openTable = (table: any) => {
    setSelectedTable(table)
    setCart([])
    setIsOrderOpen(true)
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1, name: product.name, price: product.price }]
    })
    toast({ title: "+1 " + product.name, duration: 1000 })
  }

  const sendOrder = () => {
    if (cart.length === 0) return
    startTransition(async () => {
      let res;
      if (selectedTable.status === 'free') {
        // Abrir nova mesa
        res = await createTableOrderAction(storeId!, selectedTable.id, cart)
      } else {
        // Adicionar à mesa existente
        res = await addItemsToTableAction(selectedTable.orderId, cart, selectedTable.total)
      }

      if (res.success) {
        toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" })
        setIsOrderOpen(false)
        fetchTables()
      } else {
        toast({ title: "Erro", description: res.error, variant: "destructive" })
      }
    })
  }

  const handleRequestBill = async () => {
    if (!selectedTable?.orderId) return
    await requestBillAction(selectedTable.orderId, slug)
    setIsOrderOpen(false)
    fetchTables()
    toast({ title: "Conta Solicitada", description: "O caixa foi notificado." })
  }

  const handleCloseTable = async () => {
    if(!confirm("Confirmar pagamento e liberar mesa?")) return;
    if (!selectedTable?.orderId) return
    await closeTableAction(selectedTable.orderId, slug)
    setIsOrderOpen(false)
    fetchTables()
    toast({ title: "Mesa Liberada" })
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeTab === "all" || p.category_id === activeTab
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-xl flex items-center gap-2">
          <User className="text-primary" /> Garçom
        </h1>
        <Button variant="ghost" size="icon" onClick={() => logoutStaffAction(slug)}>
          <LogOut className="w-5 h-5 text-red-400" />
        </Button>
      </header>

      {/* GRID DE MESAS */}
      <main className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => openTable(table)}
            className={`
              h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all active:scale-95 shadow-sm
              ${table.status === 'free' 
                ? 'bg-white border-slate-200 hover:border-emerald-400 text-slate-600' 
                : table.status === 'payment'
                  ? 'bg-amber-50 border-amber-400 text-amber-700 animate-pulse'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              }
            `}
          >
            <span className="text-3xl font-bold">{table.id}</span>
            <Badge variant="secondary" className="mt-2 text-[10px] uppercase">
              {table.status === 'free' ? 'Livre' : table.status === 'payment' ? 'Pagando' : `R$ ${table.total.toFixed(0)}`}
            </Badge>
          </div>
        ))}
      </main>

      {/* MODAL DE PEDIDO */}
      <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <DialogContent className="h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 w-full max-w-lg">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex justify-between items-center">
              <span>Mesa {selectedTable?.id}</span>
              <Badge variant={selectedTable?.status === 'free' ? "outline" : "destructive"}>
                {selectedTable?.status === 'free' ? "Nova Comanda" : "Ocupada"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Abas de Categorias */}
            <div className="px-2 pt-2">
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                   <div className="flex gap-2">
                      <Button variant={activeTab === 'all' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('all')} className="rounded-full">Todos</Button>
                      {categories.map(c => (
                        <Button key={c.id} variant={activeTab === c.id ? "default" : "outline"} size="sm" onClick={() => setActiveTab(c.id)} className="rounded-full">{c.name}</Button>
                      ))}
                   </div>
                </ScrollArea>
            </div>
            
            {/* Lista de Produtos */}
            <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-3 rounded-lg border flex justify-between items-center active:bg-slate-100 cursor-pointer">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-emerald-600 font-bold text-sm">R$ {p.price.toFixed(2)}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="w-4 h-4"/></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Resumo do Carrinho (se tiver itens novos) */}
            {cart.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Itens a enviar: {cart.length}</p>
                    <div className="flex gap-1 overflow-x-auto text-xs text-muted-foreground">
                        {cart.map((i, idx) => <span key={idx} className="bg-white px-1 rounded border">{i.name}</span>)}
                    </div>
                </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-white dark:bg-slate-900 flex-col gap-2">
            <div className="flex gap-2 w-full">
                {selectedTable?.status !== 'free' && (
                    <>
                        <Button variant="outline" className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={handleRequestBill}>
                            <DollarSign className="w-4 h-4 mr-2"/> Conta
                        </Button>
                        <Button variant="outline" className="flex-1 border-green-200 text-green-700 hover:bg-green-50" onClick={handleCloseTable}>
                            <CheckCircle2 className="w-4 h-4 mr-2"/> Liberar
                        </Button>
                    </>
                )}
            </div>
            <Button className="w-full h-12 text-lg" onClick={sendOrder} disabled={cart.length === 0 || isPending}>
                {isPending ? "Enviando..." : `Enviar Pedido (+ R$ ${cart.reduce((a,b) => a + (b.price*b.quantity), 0).toFixed(2)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
