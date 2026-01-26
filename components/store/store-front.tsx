"use client"

import { useState, useMemo, useEffect } from "react"
import { ShoppingBag, Plus, Minus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Interfaces
interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
}

interface CartItem extends Product {
  quantity: number
  cartId: string
}

export function StoreFront({ store, categories }: { store: any, categories: any[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // -- Lógica do Carrossel --
  const [currentSlide, setCurrentSlide] = useState(0)
  // Se 'banners' for array vazio ou nulo, usa 'banner_url' como fallback num array
  const banners = (store.banners && store.banners.length > 0) 
    ? store.banners 
    : (store.banner_url ? [store.banner_url] : [])

  // Auto-play do carrossel
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % banners.length)
    }, 4000) // Muda a cada 4 segundos
    return () => clearInterval(interval)
  }, [banners.length])

  // -- Helpers --
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const primaryColor = store.primary_color || "#ea1d2c"

  // -- Carrinho --
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1, cartId: Math.random().toString() }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId))
  }

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }))
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

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

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      
      {/* 1. CARROSSEL (Estilo Stories/Capa) */}
      <div className="relative w-full bg-slate-900 overflow-hidden">
        {/* Altura dinâmica: 
            - Mobile: h-[50vh] (metade da tela, bom para 9:16)
            - Desktop: h-[400px] (mais contido para não ocupar tudo) 
        */}
        <div className="relative h-[50vh] md:h-[400px] w-full">
            {banners.length > 0 ? (
                banners.map((img: string, index: number) => (
                    <div 
                        key={index}
                        className={cn(
                            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                        )}
                    >
                        <img src={img} alt={`Banner ${index}`} className="w-full h-full object-cover opacity-80" />
                        {/* Overlay gradiente para garantir leitura do texto */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>
                ))
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                     <span className="text-white/30 text-sm font-medium tracking-widest uppercase">Sem Imagens</span>
                </div>
            )}

            {/* Indicadores do Carrossel */}
            {banners.length > 1 && (
                <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center gap-1.5">
                    {banners.map((_: any, idx: number) => (
                        <div 
                            key={idx} 
                            className={cn(
                                "h-1 rounded-full transition-all duration-300", 
                                idx === currentSlide ? "w-6 bg-white" : "w-1.5 bg-white/40"
                            )} 
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Informações da Loja (Sobrepostas ao Banner) */}
        <div className="absolute bottom-0 left-0 w-full z-20 p-4 md:p-8 pb-6">
            <div className="flex items-end gap-4">
                {/* Logo da Loja (Uploadável) */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden shrink-0">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
                            {store.name?.substring(0,2).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex-1 text-white mb-1">
                    <h1 className="text-2xl md:text-4xl font-bold drop-shadow-md leading-tight">{store.name}</h1>
                    {store.bio && (
                        <p className="text-white/90 text-sm md:text-base line-clamp-2 mt-1 drop-shadow-sm max-w-xl">
                            {store.bio}
                        </p>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA E NAVEGAÇÃO */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 md:px-8 py-3 max-w-7xl mx-auto space-y-3">
            {/* Input Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="O que você procura hoje?" 
                    className="pl-9 bg-slate-100 border-transparent focus:bg-white transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderColor: searchTerm ? primaryColor : 'transparent' }}
                />
            </div>
            
            {/* Categorias */}
            <ScrollArea className="w-full whitespace-nowrap pb-1">
                <div className="flex gap-2">
                    {filteredCategories.map((cat) => (
                        <button 
                            key={cat.id} 
                            onClick={() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
        </div>
      </div>

      {/* 3. PRODUTOS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-10">
        {filteredCategories.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                <p>Nenhum item encontrado.</p>
             </div>
        ) : (
            filteredCategories.map((cat) => (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4">{cat.name}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cat.products.map((product: Product) => (
                            <div 
                                key={product.id} 
                                className="flex bg-white rounded-xl border border-slate-100 shadow-sm p-3 gap-3 hover:border-slate-300 transition-all cursor-pointer"
                                onClick={() => addToCart(product)}
                            >
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900 line-clamp-2 text-sm md:text-base">{product.name}</h3>
                                        <p className="text-xs md:text-sm text-slate-500 line-clamp-2 mt-1">{product.description}</p>
                                    </div>
                                    <div className="mt-2 font-bold text-slate-900">
                                        {formatPrice(product.price)}
                                    </div>
                                </div>
                                {product.image_url && (
                                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                                        <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* 4. BOTÃO FLUTUANTE (Cart) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40">
            <Button 
                className="w-full max-w-md h-14 rounded-full shadow-2xl text-white flex items-center justify-between px-6 text-lg animate-in slide-in-from-bottom-4"
                style={{ backgroundColor: primaryColor }} // COR RIGOROSAMENTE APLICADA AQUI
                onClick={() => setIsCartOpen(true)}
            >
                <div className="flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">{cartCount}</span>
                    <span className="font-medium">Ver Sacola</span>
                </div>
                <span className="font-bold">{formatPrice(cartTotal)}</span>
            </Button>
        </div>
      )}

      {/* 5. GAVETA CARRINHO */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white p-0">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
                    Sacola
                </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <ShoppingBag className="w-12 h-12 opacity-20 mb-2" />
                        <p>Sacola vazia</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cart.map((item) => (
                            <div key={item.cartId} className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex items-center border rounded-lg h-8">
                                    <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeFromCart(item.cartId)} className="px-2 h-full hover:bg-slate-100">-</button>
                                    <span className="px-2 text-sm font-medium">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.cartId, 1)} className="px-2 h-full hover:bg-slate-100">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 bg-slate-50 border-t space-y-3 pb-safe">
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(cartTotal)}</span>
                </div>
                <Button 
                    className="w-full h-12 text-lg font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }} // COR APLICADA AQUI TAMBÉM
                    disabled={cart.length === 0}
                >
                    Finalizar Pedido
                </Button>
            </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
