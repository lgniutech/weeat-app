"use client"

import { useState, useMemo } from "react"
import { ShoppingBag, Plus, Minus, MapPin, Clock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// Interfaces para Tipagem (ajuda o editor de código a te avisar erros)
interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
}

interface CartItem extends Product {
  quantity: number
  cartId: string // Identificador único no carrinho (útil se tivermos adicionais depois)
}

export function StoreFront({ store, categories }: { store: any, categories: any[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Formata valor para Real (R$)
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // --- Lógica do Carrinho ---
  
  const addToCart = (product: Product) => {
    setCart(prev => {
      // Verifica se já existe produto igual no carrinho
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        // Se existe, só aumenta a quantidade
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      // Se não, adiciona novo item
      return [...prev, { ...product, quantity: 1, cartId: Math.random().toString() }]
    })
    // Abre o carrinho automaticamente para feedback visual
    setIsCartOpen(true)
  }

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId))
  }

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta
        // Se quantidade for maior que 0 atualiza, senão mantém (ou poderia remover)
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }))
  }

  // Cálculos de totais
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  // Filtro de Busca (pesquisa por nome ou descrição)
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories
    return categories.map(cat => ({
      ...cat,
      products: cat.products.filter((p: Product) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(cat => cat.products.length > 0)
  }, [searchTerm, categories])

  // Cor principal da loja (se não tiver, usa vermelho padrão)
  const primaryColor = store.primary_color || "#ea1d2c"

  return (
    // Injetamos a cor primária como variável CSS para usar no estilo inline
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" style={{ "--primary": primaryColor } as React.CSSProperties}>
      
      {/* 1. CAPA / BANNER */}
      <div className="relative h-48 md:h-64 bg-slate-200">
        {store.banner_url ? (
          <img src={store.banner_url} alt="Capa da Loja" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-500">
            <span className="text-sm uppercase tracking-widest font-bold opacity-50">Sem Capa Definida</span>
          </div>
        )}
        
        {/* Logo Flutuante */}
        <div className="absolute -bottom-10 left-4 md:left-8 flex items-end">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                {store.logo_url ? (
                    <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
                        {store.name?.substring(0,2).toUpperCase()}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 2. CABEÇALHO DA LOJA (Infos) */}
      <div className="pt-12 px-4 md:px-8 pb-6 bg-white shadow-sm mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{store.name}</h1>
                {store.bio && <p className="text-slate-500 mt-1 max-w-2xl text-sm md:text-base">{store.bio}</p>}
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">Aberto agora</span>
                    </div>
                    {/* Exemplo estático - Futuramente vindo do banco */}
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>Retirada ou Entrega</span>
                    </div>
                </div>
            </div>

            {/* Barra de Busca */}
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar itens..." 
                    className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[var(--primary)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DE CATEGORIAS (Sticky - Cola no topo) */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-4 md:px-8 py-3">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-1">
                {filteredCategories.map((cat) => (
                    <a 
                        key={cat.id} 
                        href={`#cat-${cat.id}`}
                        className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        {cat.name}
                    </a>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* 4. LISTAGEM DE PRODUTOS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        {filteredCategories.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                <p className="text-muted-foreground text-lg">Nenhum produto encontrado.</p>
                <p className="text-sm text-slate-400">Tente buscar por outro termo.</p>
            </div>
        ) : (
            filteredCategories.map((cat) => (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800">{cat.name}</h2>
                        <Badge variant="secondary" className="text-xs font-normal text-slate-500 bg-slate-100">
                            {cat.products.length}
                        </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cat.products.map((product: Product) => (
                            <div 
                                key={product.id} 
                                className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full"
                            >
                                <div className="p-4 flex gap-4 h-full">
                                    {/* Infos do Produto */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 line-clamp-2 mb-1 group-hover:text-[var(--primary)] transition-colors">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                                                {product.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-2">
                                            <span className="font-bold text-slate-900 text-lg">{formatPrice(product.price)}</span>
                                            <Button 
                                                size="sm" 
                                                className="h-9 px-4 rounded-full bg-[var(--primary)] hover:brightness-90 text-white shadow-sm hover:shadow transition-all"
                                                onClick={() => addToCart(product)}
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Adicionar
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Imagem do Produto */}
                                    {product.image_url && (
                                        <div className="w-28 h-28 shrink-0 rounded-lg bg-slate-50 overflow-hidden">
                                            <img 
                                                src={product.image_url} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* 5. BOTÃO FLUTUANTE (Apenas Mobile - Aparece quando tem itens) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40 md:hidden">
            <Button 
                className="w-full max-w-sm h-14 rounded-full shadow-xl bg-[var(--primary)] text-white hover:brightness-90 flex items-center justify-between px-6 text-lg animate-in slide-in-from-bottom-5"
                onClick={() => setIsCartOpen(true)}
            >
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="font-bold">{cartCount}</span>
                </div>
                <span className="font-medium">Ver Sacola</span>
                <span className="font-bold">{formatPrice(cartTotal)}</span>
            </Button>
        </div>
      )}

      {/* 6. GAVETA DO CARRINHO (SHEET) */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
             <div className="hidden" />
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white">
            <SheetHeader className="border-b pb-4 px-0 mx-6">
                <SheetTitle className="flex items-center gap-2 text-xl">
                    <ShoppingBag className="w-5 h-5 text-[var(--primary)]" />
                    Sua Sacola
                </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                        <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-medium">Sua sacola está vazia.</p>
                        <p className="text-sm">Adicione itens para começar.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {cart.map((item) => (
                            <div key={item.cartId} className="flex gap-4 animate-in fade-in duration-300">
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-900 text-sm">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border rounded-lg bg-slate-50">
                                        <button 
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-l-lg transition-colors text-slate-600"
                                            onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeFromCart(item.cartId)}
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                        <button 
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-r-lg transition-colors text-slate-600"
                                            onClick={() => updateQuantity(item.cartId, 1)}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Rodapé do Carrinho */}
            <div className="border-t pt-4 mt-auto space-y-4 bg-white pb-safe">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Taxa de Entrega</span>
                        <span>Grátis</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-xl text-slate-900">
                        <span>Total</span>
                        <span>{formatPrice(cartTotal)}</span>
                    </div>
                </div>

                <Button 
                    className="w-full h-14 text-lg font-bold bg-[var(--primary)] hover:brightness-90 text-white rounded-xl shadow-lg shadow-orange-500/10"
                    disabled={cart.length === 0}
                    onClick={() => alert("Em breve: Integração com WhatsApp e Pedidos!")}
                >
                    Finalizar Pedido
                </Button>
            </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
