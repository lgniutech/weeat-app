"use client"

import { useState, useMemo, useEffect } from "react"
import { ShoppingBag, Plus, Minus, Search, X, Check, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Interfaces Atualizadas
interface Ingredient {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  ingredients?: Ingredient[]
}

interface CartItem extends Product {
  quantity: number
  cartId: string
  removedIngredients: string[] // IDs dos ingredientes removidos
  observation: string
}

export function StoreFront({ store, categories }: { store: any, categories: any[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Estado para o Modal de Produto (Personalização)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [tempObservation, setTempObservation] = useState("")
  const [tempRemovedIngredients, setTempRemovedIngredients] = useState<string[]>([])
  const [itemQuantity, setItemQuantity] = useState(1)

  const banners = (store.banners && store.banners.length > 0) 
    ? store.banners 
    : (store.banner_url ? [store.banner_url] : [])

  const fontFamily = store.font_family || "Inter"
  const primaryColor = store.primary_color || "#ea1d2c"

  // Auto-play do carrossel
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % banners.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [banners.length])

  // -- Funções Auxiliares --
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Abre modal de customização
  const handleProductClick = (product: Product) => {
      setSelectedProduct(product)
      setTempObservation("")
      setTempRemovedIngredients([])
      setItemQuantity(1)
  }

  // Adiciona ao carrinho (final)
  const confirmAddToCart = () => {
    if (!selectedProduct) return

    const newItem: CartItem = {
        ...selectedProduct,
        quantity: itemQuantity,
        cartId: Math.random().toString(),
        removedIngredients: tempRemovedIngredients,
        observation: tempObservation
    }

    setCart(prev => [...prev, newItem])
    setSelectedProduct(null)
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

  const toggleIngredient = (ingId: string) => {
      if (tempRemovedIngredients.includes(ingId)) {
          // Adicionar de volta (remover da lista de removidos)
          setTempRemovedIngredients(prev => prev.filter(id => id !== ingId))
      } else {
          // Remover (adicionar à lista de removidos)
          setTempRemovedIngredients(prev => [...prev, ingId])
      }
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
    <div className="min-h-screen bg-slate-50 pb-24" style={{ fontFamily: fontFamily }}>
      
      {/* Fonte Google */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;700&display=swap');
      `}</style>
      
      {/* 1. CARROSSEL */}
      <div className="relative w-full bg-slate-900 overflow-hidden">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </div>
                ))
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                     <span className="text-white/30 text-sm font-medium tracking-widest uppercase">Sem Imagens</span>
                </div>
            )}
        </div>

        {/* HEADER LOJA */}
        <div className="absolute bottom-0 left-0 w-full z-20 p-4 md:p-8 pb-6">
            <div className="flex items-end gap-4">
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
                    <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg leading-none tracking-tight" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                        {store.name}
                    </h1>
                    {store.bio && (
                        <p className="text-white/95 text-sm md:text-base line-clamp-2 mt-2 drop-shadow-md max-w-xl font-medium" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
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
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar itens..." 
                    className="pl-9 bg-slate-100 border-transparent focus:bg-white transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderColor: searchTerm ? primaryColor : 'transparent' }}
                />
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap pb-1">
                <div className="flex gap-2">
                    {filteredCategories.map((cat) => (
                        <button 
                            key={cat.id} 
                            onClick={() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-5 py-2 rounded-full text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        {filteredCategories.length === 0 ? (
             <div className="text-center py-20 opacity-50 flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">Nenhum item encontrado.</p>
             </div>
        ) : (
            filteredCategories.map((cat) => (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        {cat.name}
                        <div className="h-1 flex-1 bg-slate-100 rounded-full" />
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cat.products.map((product: Product) => (
                            <div 
                                key={product.id} 
                                className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-3 gap-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => handleProductClick(product)}
                            >
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-slate-900 line-clamp-2 text-base group-hover:text-[var(--primary)] transition-colors" style={{ '--primary': primaryColor } as any}>
                                            {product.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                            {product.description}
                                        </p>
                                        {/* Badge visual de ingredientes */}
                                        {product.ingredients && product.ingredients.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                                <span className="font-medium">Contém:</span> {product.ingredients.map(i => i.name).join(", ")}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-3 font-bold text-lg text-slate-900">
                                        {formatPrice(product.price)}
                                    </div>
                                </div>
                                {product.image_url && (
                                    <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                                        <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} />
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
                className="w-full max-w-md h-16 rounded-full shadow-2xl text-white flex items-center justify-between px-8 text-lg animate-in slide-in-from-bottom-4 hover:brightness-110 transition-all"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setIsCartOpen(true)}
            >
                <div className="flex items-center gap-3">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">{cartCount}</span>
                    <span className="font-bold tracking-wide">Ver Sacola</span>
                </div>
                <span className="font-bold text-xl">{formatPrice(cartTotal)}</span>
            </Button>
        </div>
      )}

      {/* 5. GAVETA CARRINHO */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white p-0 font-sans" style={{ fontFamily: fontFamily }}>
            <SheetHeader className="p-5 border-b bg-slate-50/50">
                <SheetTitle className="flex items-center gap-3 text-xl">
                    <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
                    Sua Sacola
                </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 p-5">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-medium text-lg">Sua sacola está vazia</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {cart.map((item) => (
                            <div key={item.cartId} className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-slate-900 text-base">{item.name}</p>
                                        <p className="text-sm font-medium text-slate-900">{formatPrice(item.price * item.quantity)}</p>
                                    </div>
                                    
                                    {/* Exibição das Customizações no Carrinho */}
                                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                        {item.removedIngredients.length > 0 && (
                                            <p className="text-red-500/80">
                                                <span className="font-medium text-red-600">Sem:</span> {item.ingredients?.filter(i => item.removedIngredients.includes(i.id)).map(i => i.name).join(", ")}
                                            </p>
                                        )}
                                        {item.observation && (
                                            <p className="italic">"{item.observation}"</p>
                                        )}
                                    </div>

                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center border-2 border-slate-100 rounded-lg h-8 bg-white shadow-sm">
                                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeFromCart(item.cartId)} className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-red-500 transition-colors">-</button>
                                        <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-green-600 transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-5 bg-slate-50 border-t space-y-4 pb-safe shadow-inner">
                <div className="flex justify-between font-bold text-xl text-slate-900">
                    <span>Total</span>
                    <span>{formatPrice(cartTotal)}</span>
                </div>
                <Button 
                    className="w-full h-14 text-lg font-bold text-white hover:brightness-110 transition-all shadow-lg active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor }}
                    disabled={cart.length === 0}
                    onClick={() => alert("Checkout em breve!")}
                >
                    Finalizar Pedido
                </Button>
            </div>
        </SheetContent>
      </Sheet>

      {/* 6. MODAL DE DETALHES/PERSONALIZAÇÃO DO PRODUTO */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-none sm:rounded-2xl">
            {selectedProduct && (
                <>
                    {/* Header com Imagem */}
                    <div className="relative h-48 w-full bg-slate-100">
                        {selectedProduct.image_url ? (
                            <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center bg-slate-100 text-slate-300">
                                <Search className="h-12 w-12" />
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white text-black backdrop-blur-sm"
                            onClick={() => setSelectedProduct(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-6 space-y-6">
                            <div>
                                <DialogTitle className="text-2xl font-bold">{selectedProduct.name}</DialogTitle>
                                <DialogDescription className="text-base text-slate-500 mt-2">{selectedProduct.description}</DialogDescription>
                            </div>

                            {/* Seção de Ingredientes (Customização) */}
                            {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        Ingredientes <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full lowercase">Remova o que não quiser</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedProduct.ingredients.map(ing => {
                                            const isRemoved = tempRemovedIngredients.includes(ing.id);
                                            return (
                                                <div 
                                                    key={ing.id} 
                                                    onClick={() => toggleIngredient(ing.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                                                        isRemoved ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-primary/20 shadow-sm"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded flex items-center justify-center transition-colors",
                                                            isRemoved ? "bg-slate-200" : "bg-green-500 text-white"
                                                        )}>
                                                            {!isRemoved && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className={cn("font-medium", isRemoved && "text-slate-500 line-through decoration-slate-400")}>{ing.name}</span>
                                                    </div>
                                                    {!isRemoved && <span className="text-xs text-green-600 font-medium">Incluso</span>}
                                                    {isRemoved && <span className="text-xs text-slate-400">Removido</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Observações */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Alguma observação?
                                </Label>
                                <Textarea 
                                    placeholder="Ex: Tocar a campainha, caprichar no molho..." 
                                    className="resize-none"
                                    value={tempObservation}
                                    onChange={e => setTempObservation(e.target.value)}
                                />
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer de Ação */}
                    <div className="p-4 border-t bg-slate-50 flex items-center gap-4">
                        <div className="flex items-center border rounded-lg bg-white h-12 shadow-sm">
                            <button onClick={() => setItemQuantity(q => Math.max(1, q - 1))} className="px-4 h-full hover:bg-slate-50 text-slate-500">-</button>
                            <span className="w-8 text-center font-bold">{itemQuantity}</span>
                            <button onClick={() => setItemQuantity(q => q + 1)} className="px-4 h-full hover:bg-slate-50 text-slate-500">+</button>
                        </div>
                        <Button 
                            className="flex-1 h-12 text-lg font-bold text-white shadow-md hover:brightness-110"
                            style={{ backgroundColor: primaryColor }}
                            onClick={confirmAddToCart}
                        >
                            Adicionar {formatPrice(selectedProduct.price * itemQuantity)}
                        </Button>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
