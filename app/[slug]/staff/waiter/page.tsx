"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getStaffSession, logoutStaffAction } from "@/app/actions/staff"
import { getTablesStatusAction, createTableOrderAction, addItemsToTableAction, closeTableAction } from "@/app/actions/waiter"
import { getCategoriesAction } from "@/app/actions/menu" 
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Plus, Search, CheckCircle2, ShoppingBag, Minus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function WaiterPage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [tables, setTables] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  
  // Estado do Modal
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  
  // Carrinho local (para novos itens)
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
      
      // Carrega cardápio
      const cats = await getCategoriesAction(session.storeId)
      setCategories(cats)
      const allProds = cats.flatMap((c: any) => c.products || []).filter((p: any) => p.is_available)
      setProducts(allProds)
    }
    init()
  }, [slug, router])

  // 2. Polling das Mesas (Atualiza status real-time se cliente pedir pelo QR)
  const fetchTables = async () => {
    if (!storeId) return
    const data = await getTablesStatusAction(storeId)
    setTables(data)
  }

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 5000) // Atualiza a cada 5s
    return () => clearInterval(interval)
  }, [storeId])

  // --- LÓGICA DE UI ---
  const openTable = (table: any) => {
    setSelectedTable(table)
    setCart([]) // Limpa carrinho de novos itens
    setSearchQuery("")
    setIsOrderOpen(true)
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1, name: product.name, price: product.price }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.id !== productId))
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

  const handleCloseTable = async () => {
    if(!confirm("Tem certeza que deseja fechar esta mesa?")) return;
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

  // Calcula total SOMANDO o que já está na mesa + carrinho novo
  const currentTableTotal = selectedTable?.total || 0;
  const newItemsTotal = cart.reduce((a,b) => a + (b.price*b.quantity), 0);
  const grandTotal = currentTableTotal + newItemsTotal;

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
              h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all active:scale-95 shadow-sm relative overflow-hidden
              ${table.status === 'free' 
                ? 'bg-white border-slate-200 hover:border-emerald-400 text-slate-400' 
                : table.status === 'payment'
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'bg-blue-50 border-blue-400 text-blue-700'
              }
            `}
          >
            <span className="text-3xl font-bold">{table.id}</span>
            <Badge variant="secondary" className="mt-2 text-[10px] uppercase font-bold bg-white/50 backdrop-blur-sm">
              {table.status === 'free' ? 'Livre' : `R$ ${table.total.toFixed(0)}`}
            </Badge>
            {table.status === 'payment' && <div className="absolute top-0 right-0 p-1 bg-amber-400 rounded-bl-lg text-[10px] font-bold text-white">CONTA</div>}
          </div>
        ))}
      </main>

      {/* MODAL DE PEDIDO / MESA */}
      <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <DialogContent className="h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 w-full max-w-lg overflow-hidden">
          
          {/* Header do Modal */}
          <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
            <div>
              <DialogTitle className="text-lg">Mesa {selectedTable?.id}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {selectedTable?.status === 'free' ? "Nova Comanda" : `Ocupada • Total: R$ ${currentTableTotal.toFixed(2)}`}
              </p>
            </div>
            {selectedTable?.status !== 'free' && (
              <Button variant="destructive" size="sm" onClick={handleCloseTable} className="h-8">
                Liberar Mesa
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Se Mesa Ocupada: Mostrar Resumo do que JÁ PEDIRAM */}
            {selectedTable?.status !== 'free' && selectedTable?.items && selectedTable.items.length > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800 p-2 text-xs border-b max-h-[100px] overflow-y-auto">
                    <p className="font-bold text-slate-500 mb-1">JÁ PEDIDO:</p>
                    <ul className="space-y-1">
                        {selectedTable.items.map((i: any, idx: number) => (
                            <li key={idx} className="flex justify-between">
                                <span>{i.quantity}x {i.name}</span>
                                <span>R$ {(i.price * i.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Filtros e Busca */}
            <div className="p-2 space-y-2 bg-white dark:bg-slate-900">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar produto..." 
                        className="pl-8 h-9" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <ScrollArea className="w-full whitespace-nowrap">
                   <div className="flex gap-2 pb-2">
                      <Button variant={activeTab === 'all' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('all')} className="rounded-full h-7 text-xs">Todos</Button>
                      {categories.map(c => (
                        <Button key={c.id} variant={activeTab === c.id ? "default" : "outline"} size="sm" onClick={() => setActiveTab(c.id)} className="rounded-full h-7 text-xs">{c.name}</Button>
                      ))}
                   </div>
                </ScrollArea>
            </div>
            
            {/* Lista de Produtos (Cardápio) */}
            <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-2">
              <div className="grid grid-cols-1 gap-2">
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-3 rounded-lg border flex justify-between items-center active:bg-slate-100 cursor-pointer shadow-sm">
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-emerald-600 font-bold text-xs">R$ {p.price.toFixed(2)}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700"><Plus className="w-4 h-4"/></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Carrinho de Lançamento (Novos Itens) */}
            {cart.length > 0 && (
                <div className="p-3 bg-white border-t shadow-lg z-10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm">Novos Itens ({cart.length})</span>
                        <span className="font-bold text-emerald-600">R$ {newItemsTotal.toFixed(2)}</span>
                    </div>
                    <div className="max-h-[80px] overflow-y-auto space-y-2 mb-3">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <span>{item.quantity}x {item.name}</span>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" onClick={() => removeFromCart(item.id)}>
                                    <Minus className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button className="w-full h-12 text-lg font-bold" onClick={sendOrder} disabled={isPending}>
                        {isPending ? "Enviando..." : "LANÇAR PEDIDO"}
                    </Button>
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
