"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider, useTheme } from "next-themes" // Importando ThemeProvider
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Plus, Search, CheckCircle2, Minus, Utensils, Moon, Sun } from "lucide-react"
import { Input } from "@/components/ui/input"

// Componente Interno (Conteúdo da Página)
function WaiterContent({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [tables, setTables] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  
  // UI States
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [isManagementOpen, setIsManagementOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // Cart & Search
  const [cart, setCart] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme() // Hook do tema local

  // Auth & Init
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

  // Polling
  const fetchTables = async () => {
    if (!storeId) return
    const data = await getTablesStatusAction(storeId)
    setTables(data)
  }

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 5000)
    return () => clearInterval(interval)
  }, [storeId])

  // Ações
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

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1, name: product.name, price: product.price }]
    })
    toast({ title: "+1 " + product.name, duration: 500 })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.id !== productId))
  }

  const sendOrder = () => {
    if (cart.length === 0) return
    startTransition(async () => {
      let res;
      if (selectedTable.status === 'free') {
        res = await createTableOrderAction(storeId!, selectedTable.id, cart)
      } else {
        res = await addItemsToTableAction(selectedTable.orderId, cart, selectedTable.total)
      }

      if (res.success) {
        toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" })
        setIsMenuOpen(false)
        fetchTables()
      } else {
        toast({ title: "Erro", description: res.error || "Falha ao enviar", variant: "destructive" })
      }
    })
  }

  const handleCloseTable = async () => {
    if(!confirm("Recebeu o pagamento? Liberar mesa agora?")) return;
    if (!selectedTable?.orderId) return
    await closeTableAction(selectedTable.orderId, slug)
    setIsManagementOpen(false)
    fetchTables()
    toast({ title: "Mesa Liberada" })
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeTab === "all" || p.category_id === activeTab
    return matchSearch && matchCat
  })

  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'preparando': return <Badge className="bg-blue-500">Na Cozinha</Badge>;
        case 'pronto_cozinha': return <Badge className="bg-green-500 animate-pulse">Pronto p/ Servir</Badge>;
        case 'entregue': return <Badge variant="secondary">Entregue</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  const currentTableTotal = selectedTable?.total || 0;
  const newItemsTotal = cart.reduce((a,b) => a + (b.price*b.quantity), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <User className="text-primary" /> Garçom
        </h1>
        <div className="flex gap-2">
            {/* Botão de Tema INDEPENDENTE (graças ao ThemeProvider local) */}
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logoutStaffAction(slug)}>
                <LogOut className="w-5 h-5 text-red-400" />
            </Button>
        </div>
      </header>

      {/* Grid Mesas */}
      <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => openTableManagement(table)}
            className={`
              h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all active:scale-95 shadow-sm relative overflow-hidden
              ${table.status === 'free' 
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-slate-400 dark:text-slate-500' 
                : table.orderStatus === 'pronto_cozinha'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-green-100 dark:shadow-none'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-400'
              }
            `}
          >
            <span className="text-3xl font-bold">{table.id}</span>
            <div className="mt-2 flex flex-col items-center">
                 {table.status === 'free' ? (
                     <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">LIVRE</Badge>
                 ) : (
                     <>
                        <span className="text-xs font-bold">R$ {table.total.toFixed(0)}</span>
                        {table.orderStatus === 'pronto_cozinha' && (
                            <span className="absolute top-2 right-2 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        )}
                     </>
                 )}
            </div>
          </div>
        ))}
      </main>

      {/* Modal Gestão */}
      <Dialog open={isManagementOpen} onOpenChange={setIsManagementOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
                <DialogTitle className="flex justify-between items-center text-slate-900 dark:text-slate-100">
                    <span>Mesa {selectedTable?.id}</span>
                    <Badge variant={selectedTable?.status === 'free' ? "outline" : "default"}>
                        {selectedTable?.status === 'free' ? "Livre" : "Ocupada"}
                    </Badge>
                </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                {selectedTable?.status === 'free' ? (
                    <div className="text-center py-6 space-y-4">
                        <Utensils className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                        <p className="text-muted-foreground">Mesa disponível.</p>
                        <Button className="w-full h-12 text-lg" onClick={openMenu}>
                            <Plus className="mr-2 h-5 w-5"/> Abrir Novo Pedido
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg flex justify-between items-center border border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status Cozinha:</span>
                            {getStatusLabel(selectedTable?.orderStatus)}
                         </div>

                         <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-[200px] overflow-y-auto bg-white dark:bg-slate-950">
                            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">Consumo Atual</p>
                            {selectedTable?.items && selectedTable.items.length > 0 ? (
                                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                    {selectedTable.items.map((item: any, i: number) => (
                                        <li key={i} className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-800 pb-1 last:border-0">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-xs italic text-muted-foreground">Nenhum item lançado ainda.</p>}
                         </div>

                         <div className="flex justify-between items-center text-lg font-bold px-2 text-slate-900 dark:text-slate-100">
                             <span>Total Parcial:</span>
                             <span>R$ {currentTableTotal.toFixed(2)}</span>
                         </div>

                         <div className="grid grid-cols-2 gap-3 pt-2">
                             <Button variant="outline" className="h-12 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/30" onClick={openMenu}>
                                <Plus className="mr-2 h-4 w-4"/> Adicionar Item
                             </Button>
                             <Button variant="destructive" className="h-12" onClick={handleCloseTable}>
                                <CheckCircle2 className="mr-2 h-4 w-4"/> Encerrar Mesa
                             </Button>
                         </div>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>

      {/* Modal Menu */}
      <Dialog open={isMenuOpen} onOpenChange={(open) => {
          if(!open) setIsManagementOpen(true)
          setIsMenuOpen(open)
      }}>
        <DialogContent className="h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 w-full max-w-lg bg-white dark:bg-slate-950 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
               <DialogTitle className="text-slate-900 dark:text-slate-100">Adicionar à Mesa {selectedTable?.id}</DialogTitle>
               <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>Cancelar</Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="p-2 space-y-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar produto..." 
                            className="pl-8 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="w-full whitespace-nowrap">
                       <div className="flex gap-2 pb-1">
                          <Button variant={activeTab === 'all' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('all')} className="rounded-full h-7 text-xs">Todos</Button>
                          {categories.map(c => (
                            <Button key={c.id} variant={activeTab === c.id ? "default" : "outline"} size="sm" onClick={() => setActiveTab(c.id)} className="rounded-full h-7 text-xs">{c.name}</Button>
                          ))}
                       </div>
                    </ScrollArea>
                </div>

                <ScrollArea className="flex-1 p-2 bg-white dark:bg-slate-950">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredProducts.length === 0 ? (
                            <p className="text-center text-muted-foreground py-10">Nenhum produto encontrado.</p>
                        ) : (
                            filteredProducts.map(p => (
                            <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer shadow-sm">
                                <div>
                                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.name}</div>
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">R$ {p.price.toFixed(2)}</div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Plus className="w-4 h-4"/></Button>
                            </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {cart.length > 0 && (
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg z-10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Novos Itens ({cart.length})</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Total: R$ {newItemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="max-h-[80px] overflow-y-auto space-y-2 mb-3 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                                    <span>{item.quantity}x {item.name}</span>
                                    <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" onClick={() => removeFromCart(item.id)}>
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full h-12 text-lg font-bold" onClick={sendOrder} disabled={isPending}>
                            {isPending ? "Enviando..." : "CONFIRMAR PEDIDO"}
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrapper Principal que isola o Tema
export default function WaiterPageWrapper({ params }: { params: { slug: string } }) {
    // Usamos 'staff-theme' como chave para não conflitar com 'theme' (admin)
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="staff-theme">
            <WaiterContent params={params} />
        </ThemeProvider>
    )
}
