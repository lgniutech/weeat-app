"use client"

import { useState, useMemo, useEffect } from "react"
import { ShoppingBag, Search, X, Check, MessageSquare, Plus, Bike, Store, MapPin, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" 
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn, formatPhone, cleanPhone } from "@/lib/utils" // IMPORTADO formatPhone e cleanPhone
import { createOrderAction } from "@/app/actions/order"

// Interfaces
interface Ingredient { id: string; name: string }
interface Addon { id: string; name: string; price: number }

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  ingredients?: Ingredient[]
  addons?: Addon[]
}

interface CartItem extends Product {
  quantity: number
  cartId: string
  removedIngredients: string[] 
  selectedAddons: string[] 
  observation: string
  totalPrice: number
}

// Estados do Checkout
interface CheckoutData {
    name: string
    phone: string
    deliveryType: "entrega" | "retirada"
    address: string
    paymentMethod: "pix" | "cartao" | "dinheiro"
    changeFor: string
}

export function StoreFront({ store, categories }: { store: any, categories: any[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Checkout States
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart")
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: "", phone: "", deliveryType: "entrega", address: "", paymentMethod: "pix", changeFor: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Product Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [tempObservation, setTempObservation] = useState("")
  const [tempRemovedIngredients, setTempRemovedIngredients] = useState<string[]>([])
  const [tempSelectedAddons, setTempSelectedAddons] = useState<string[]>([])
  const [itemQuantity, setItemQuantity] = useState(1)

  const banners = (store.banners && store.banners.length > 0) ? store.banners : (store.banner_url ? [store.banner_url] : [])
  const fontFamily = store.font_family || "Inter"
  const primaryColor = store.primary_color || "#ea1d2c"

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => setCurrentSlide(prev => (prev + 1) % banners.length), 4000)
    return () => clearInterval(interval)
  }, [banners.length])

  const formatPrice = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const handleProductClick = (product: Product) => {
      setSelectedProduct(product)
      setTempObservation("")
      setTempRemovedIngredients([])
      setTempSelectedAddons([])
      setItemQuantity(1)
  }

  const calculateItemTotal = (product: Product, selectedAddonIds: string[]) => {
      const addonsTotal = product.addons
        ?.filter(a => selectedAddonIds.includes(a.id))
        .reduce((sum, a) => sum + a.price, 0) || 0
      return product.price + addonsTotal
  }

  const confirmAddToCart = () => {
    if (!selectedProduct) return
    const unitPrice = calculateItemTotal(selectedProduct, tempSelectedAddons)
    const newItem: CartItem = {
        ...selectedProduct,
        quantity: itemQuantity,
        cartId: Math.random().toString(),
        removedIngredients: tempRemovedIngredients,
        selectedAddons: tempSelectedAddons,
        observation: tempObservation,
        totalPrice: unitPrice
    }
    setCart(prev => [...prev, newItem])
    setSelectedProduct(null)
    setIsCartOpen(true)
    setStep("cart")
  }

  const removeFromCart = (cartId: string) => setCart(prev => prev.filter(item => item.cartId !== cartId))

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
      setTempRemovedIngredients(prev => prev.includes(ingId) ? prev.filter(id => id !== ingId) : [...prev, ingId])
  }

  const toggleAddon = (addonId: string) => {
      setTempSelectedAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId])
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.totalPrice * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  // --- LÓGICA DE ENVIO DO PEDIDO ---
  const handleFinishOrder = async () => {
    if (!checkoutData.name || !checkoutData.phone) return alert("Preencha nome e telefone.")
    if (checkoutData.deliveryType === 'entrega' && !checkoutData.address) return alert("Informe o endereço.")

    setIsSubmitting(true)

    const formattedItems = cart.map(item => {
        const resolvedAddons = item.addons
            ?.filter(a => item.selectedAddons.includes(a.id))
            .map(a => ({ name: a.name, price: a.price })) || []

        const resolvedRemoved = item.ingredients
            ?.filter(i => item.removedIngredients.includes(i.id))
            .map(i => i.name) || []

        return {
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.totalPrice,
            observation: item.observation,
            removed_ingredients: resolvedRemoved,
            selected_addons: resolvedAddons
        }
    })

    // HIGIENE DE DADOS: Limpa o telefone antes de salvar
    const cleanNumber = cleanPhone(checkoutData.phone)

    const orderPayload = {
        storeId: store.id,
        customerName: checkoutData.name,
        customerPhone: cleanNumber, // SALVA SOMENTE NÚMEROS
        deliveryType: checkoutData.deliveryType,
        address: checkoutData.address,
        paymentMethod: checkoutData.paymentMethod,
        changeFor: checkoutData.changeFor,
        totalPrice: cartTotal,
        items: formattedItems
    }

    const res = await createOrderAction(orderPayload)

    setIsSubmitting(false)

    if (res.success) {
        setStep("success")
        setCart([])
    } else {
        alert("Erro ao enviar pedido. Tente novamente.")
    }
  }

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories
    return categories.map(cat => ({
      ...cat,
      products: cat.products.filter((p: Product) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(cat => cat.products.length > 0)
  }, [searchTerm, categories])

  return (
    <div className="min-h-screen bg-slate-50 pb-24" style={{ fontFamily: fontFamily }}>
      <style jsx global>{`@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;700&display=swap');`}</style>
      
      {/* HEADER E BANNER */}
      <div className="relative w-full bg-slate-900 overflow-hidden">
        <div className="relative h-[40vh] md:h-[350px] w-full">
            {banners.length > 0 ? (
                banners.map((img: string, index: number) => (
                    <div key={index} className={cn("absolute inset-0 transition-opacity duration-1000 ease-in-out", index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0")}>
                        <img src={img} alt={`Banner ${index}`} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </div>
                ))
            ) : (<div className="w-full h-full flex items-center justify-center bg-slate-800"><span className="text-white/30 text-sm font-medium tracking-widest uppercase">Sem Imagens</span></div>)}
        </div>
        <div className="absolute bottom-0 left-0 w-full z-20 p-4 md:p-8 pb-6">
            <div className="flex items-end gap-4">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden shrink-0">
                    {store.logo_url ? (<img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">{store.name?.substring(0,2).toUpperCase()}</div>)}
                </div>
                <div className="flex-1 text-white mb-1">
                    <h1 className="text-2xl md:text-4xl font-bold drop-shadow-lg leading-none tracking-tight">{store.name}</h1>
                    {store.bio && (<p className="text-white/90 text-xs md:text-sm line-clamp-2 mt-1 drop-shadow-md max-w-xl font-medium">{store.bio}</p>)}
                </div>
            </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 md:px-8 py-3 max-w-7xl mx-auto space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="O que você quer comer hoje?" className="pl-9 bg-slate-100 border-transparent focus:bg-white transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ borderColor: searchTerm ? primaryColor : 'transparent' }} />
            </div>
            <ScrollArea className="w-full whitespace-nowrap pb-1">
                <div className="flex gap-2">
                    {filteredCategories.map((cat) => (
                        <button key={cat.id} onClick={() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-5 py-2 rounded-full text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                            {cat.name}
                        </button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        {filteredCategories.length === 0 ? (
             <div className="text-center py-20 opacity-50 flex flex-col items-center"><Search className="w-12 h-12 mb-4 text-slate-300" /><p className="text-lg font-medium text-slate-500">Nenhum item encontrado.</p></div>
        ) : (
            filteredCategories.map((cat) => (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">{cat.name}<div className="h-1 flex-1 bg-slate-100 rounded-full" /></h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cat.products.map((product: Product) => (
                            <div key={product.id} className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-3 gap-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => handleProductClick(product)}>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-slate-900 line-clamp-2 text-base group-hover:text-[var(--primary)] transition-colors" style={{ '--primary': primaryColor } as any}>{product.name}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                                    </div>
                                    <div className="mt-3 font-bold text-lg text-slate-900">{formatPrice(product.price)}</div>
                                </div>
                                {product.image_url && (<div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100"><img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} /></div>)}
                            </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* BOTÃO FLUTUANTE */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40">
            <Button className="w-full max-w-md h-16 rounded-full shadow-2xl text-white flex items-center justify-between px-8 text-lg animate-in slide-in-from-bottom-4 hover:brightness-110 transition-all" style={{ backgroundColor: primaryColor }} onClick={() => setIsCartOpen(true)}>
                <div className="flex items-center gap-3"><span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">{cartCount}</span><span className="font-bold tracking-wide">Ver Sacola</span></div>
                <span className="font-bold text-xl">{formatPrice(cartTotal)}</span>
            </Button>
        </div>
      )}

      {/* SHEET: CARRINHO E CHECKOUT */}
      <Sheet open={isCartOpen} onOpenChange={(open) => { setIsCartOpen(open); if(!open) setTimeout(() => setStep("cart"), 300); }}>
        {/* CORREÇÃO CRÍTICA: gap-0, flex-col, h-[100dvh] e overflow-hidden no container principal */}
        <SheetContent className="w-full sm:max-w-md bg-slate-50 p-0 font-sans gap-0 flex flex-col h-[100dvh] overflow-hidden" style={{ fontFamily: fontFamily }}>
            
            {/* ETAPA 1: CARRINHO */}
            {step === "cart" && (
                <>
                    {/* Header: shrink-0 para não amassar */}
                    <SheetHeader className="p-5 border-b bg-white shrink-0"><SheetTitle className="flex items-center gap-3 text-xl"><ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />Sua Sacola</SheetTitle></SheetHeader>
                    
                    {/* Body: flex-1, min-h-0 (CRUCIAL PARA SCROLL) e overflow-y-auto */}
                    <div className="flex-1 overflow-y-auto min-h-0 p-5 bg-slate-50">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4"><div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 opacity-20" /></div><p className="font-medium text-lg">Sua sacola está vazia</p></div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map((item) => (
                                    <div key={item.cartId} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex-1">
                                            <div className="flex justify-between"><p className="font-bold text-slate-900 text-sm">{item.name}</p><p className="text-sm font-bold text-slate-900">{formatPrice(item.totalPrice * item.quantity)}</p></div>
                                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                                {item.removedIngredients.length > 0 && (<p className="text-red-500/80"><span className="font-medium text-red-600">Sem:</span> {item.ingredients?.filter(i => item.removedIngredients.includes(i.id)).map(i => i.name).join(", ")}</p>)}
                                                {item.selectedAddons.length > 0 && (<p className="text-green-600"><span className="font-medium">Mais:</span> {item.addons?.filter(a => item.selectedAddons.includes(a.id)).map(a => `${a.name}`).join(", ")}</p>)}
                                                {item.observation && (<p className="italic">"{item.observation}"</p>)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center border border-slate-200 rounded-lg h-8 bg-slate-50">
                                                <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeFromCart(item.cartId)} className="w-8 h-full flex items-center justify-center hover:bg-white text-slate-500 hover:text-red-500 transition-colors rounded-l-lg">-</button>
                                                <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-full flex items-center justify-center hover:bg-white text-slate-500 hover:text-green-600 transition-colors rounded-r-lg">+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Footer: shrink-0 e z-index alto */}
                    <div className="p-5 bg-white border-t space-y-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 z-20">
                        <div className="flex justify-between font-bold text-xl text-slate-900"><span>Total</span><span>{formatPrice(cartTotal)}</span></div>
                        <Button className="w-full h-14 text-lg font-bold text-white hover:brightness-110 transition-all shadow-lg active:scale-[0.98]" style={{ backgroundColor: primaryColor }} disabled={cart.length === 0} onClick={() => setStep("checkout")}>Continuar</Button>
                    </div>
                </>
            )}

            {/* ETAPA 2: CHECKOUT */}
            {step === "checkout" && (
                <>
                    <SheetHeader className="p-5 border-b bg-white flex flex-row items-center gap-3 space-y-0 shrink-0"><Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStep("cart")}><X className="h-4 w-4" /></Button><SheetTitle className="text-xl">Finalizar Pedido</SheetTitle></SheetHeader>
                    
                    <div className="flex-1 overflow-y-auto min-h-0 p-5 bg-white">
                        <div className="space-y-6 pb-4">
                            {/* Identificação */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">1</div> Seus Dados</h3>
                                <div className="grid gap-3 pl-8">
                                    <div><Label>Seu Nome</Label><Input placeholder="Como te chamamos?" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} /></div>
                                    <div>
                                        <Label>WhatsApp / Telefone</Label>
                                        <Input 
                                            placeholder="(00) 00000-0000" 
                                            type="tel" 
                                            value={checkoutData.phone} 
                                            // APLICA MÁSCARA NO ONCHANGE
                                            onChange={e => setCheckoutData({...checkoutData, phone: formatPhone(e.target.value)})} 
                                            maxLength={15}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Entrega */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">2</div> Entrega</h3>
                                <div className="pl-8 space-y-3">
                                    <RadioGroup value={checkoutData.deliveryType} onValueChange={(v: any) => setCheckoutData({...checkoutData, deliveryType: v})} className="grid grid-cols-2 gap-3">
                                        <Label className={cn("flex flex-col items-center justify-center border-2 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all", checkoutData.deliveryType === 'entrega' ? "border-primary bg-primary/5 text-primary" : "border-slate-200")}>
                                            <RadioGroupItem value="entrega" className="sr-only" />
                                            <Bike className="mb-2 h-6 w-6" />
                                            <span className="font-bold">Entrega</span>
                                        </Label>
                                        <Label className={cn("flex flex-col items-center justify-center border-2 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all", checkoutData.deliveryType === 'retirada' ? "border-primary bg-primary/5 text-primary" : "border-slate-200")}>
                                            <RadioGroupItem value="retirada" className="sr-only" />
                                            <Store className="mb-2 h-6 w-6" />
                                            <span className="font-bold">Retirada</span>
                                        </Label>
                                    </RadioGroup>
                                    
                                    {checkoutData.deliveryType === 'entrega' && (
                                        <div className="animate-in slide-in-from-top-2 fade-in">
                                            <Label>Endereço Completo</Label>
                                            <Textarea placeholder="Rua, Número, Bairro e Complemento..." value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="mt-1.5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pagamento */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">3</div> Pagamento</h3>
                                <div className="pl-8 space-y-3">
                                    <RadioGroup value={checkoutData.paymentMethod} onValueChange={(v: any) => setCheckoutData({...checkoutData, paymentMethod: v})} className="space-y-2">
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg"><RadioGroupItem value="pix" id="pix" /><Label htmlFor="pix" className="flex-1 cursor-pointer font-medium">Pix (Na entrega/retirada)</Label></div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg"><RadioGroupItem value="cartao" id="cartao" /><Label htmlFor="cartao" className="flex-1 cursor-pointer font-medium">Cartão (Maquininha)</Label></div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg"><RadioGroupItem value="dinheiro" id="dinheiro" /><Label htmlFor="dinheiro" className="flex-1 cursor-pointer font-medium">Dinheiro</Label></div>
                                    </RadioGroup>
                                    {checkoutData.paymentMethod === 'dinheiro' && (
                                        <div className="animate-in slide-in-from-top-2 fade-in"><Label>Troco para quanto?</Label><Input placeholder="Ex: R$ 50,00" value={checkoutData.changeFor} onChange={e => setCheckoutData({...checkoutData, changeFor: e.target.value})} className="mt-1.5" /></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="p-5 bg-white border-t space-y-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 z-20">
                        <div className="flex justify-between font-bold text-xl text-slate-900"><span>Total</span><span>{formatPrice(cartTotal)}</span></div>
                        <Button className="w-full h-14 text-lg font-bold text-white hover:brightness-110 transition-all shadow-lg" style={{ backgroundColor: primaryColor }} onClick={handleFinishOrder} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Enviar Pedido"}
                        </Button>
                    </div>
                </>
            )}

            {/* ETAPA 3: SUCESSO */}
            {step === "success" && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600"><Check className="w-12 h-12" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Pedido Recebido!</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">A loja já recebeu seu pedido e começará a preparar em breve.</p>
                    <Button variant="outline" className="w-full h-12 border-2 font-bold" onClick={() => setIsCartOpen(false)}>Voltar ao Cardápio</Button>
                </div>
            )}

        </SheetContent>
      </Sheet>

      {/* MODAL DO PRODUTO (Mantido e Otimizado) */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-none sm:rounded-2xl">
            {selectedProduct && (
                <>
                    <div className="relative h-48 w-full bg-slate-100">
                        {selectedProduct.image_url ? (<img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />) : (<div className="flex h-full items-center justify-center bg-slate-100 text-slate-300"><Search className="h-12 w-12" /></div>)}
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white text-black backdrop-blur-sm" onClick={() => setSelectedProduct(null)}><X className="h-4 w-4" /></Button>
                    </div>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-6 space-y-6">
                            <div><DialogTitle className="text-2xl font-bold">{selectedProduct.name}</DialogTitle><DialogDescription className="text-base text-slate-500 mt-2">{selectedProduct.description}</DialogDescription></div>

                            {/* INGREDIENTES */}
                            {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">Ingredientes <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full lowercase">Remova o que não quiser</span></h3>
                                    <div className="space-y-2">
                                        {selectedProduct.ingredients.map(ing => {
                                            const isRemoved = tempRemovedIngredients.includes(ing.id);
                                            return (
                                                <div key={ing.id} onClick={() => toggleIngredient(ing.id)} className={cn("flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer", isRemoved ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white shadow-sm")} style={{ borderColor: !isRemoved ? `${primaryColor}40` : undefined }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors text-white", isRemoved ? "bg-slate-200" : "")} style={{ backgroundColor: !isRemoved ? primaryColor : undefined }}>{!isRemoved && <Check className="w-3.5 h-3.5" />}</div>
                                                        <span className={cn("font-medium", isRemoved && "text-slate-500 line-through decoration-slate-400")}>{ing.name}</span>
                                                    </div>
                                                    {!isRemoved && <span className="text-xs font-medium" style={{ color: primaryColor }}>Incluso</span>}{isRemoved && <span className="text-xs text-slate-400">Removido</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ADICIONAIS */}
                            {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">Turbine seu pedido <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full lowercase">Escolha extras</span></h3>
                                    <div className="space-y-2">
                                        {selectedProduct.addons.map(adon => {
                                            const isSelected = tempSelectedAddons.includes(adon.id);
                                            return (
                                                <div key={adon.id} onClick={() => toggleAddon(adon.id)} className={cn("flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer", isSelected ? "bg-yellow-50 border-yellow-500 shadow-sm" : "bg-white border-slate-100")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-yellow-500 border-yellow-500 text-white" : "border-slate-300")}>{isSelected && <Check className="w-3.5 h-3.5" />}</div>
                                                        <span className="font-medium">{adon.name}</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700">+ {formatPrice(adon.price)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Alguma observação?</Label>
                                <Textarea placeholder="Ex: Tocar a campainha, caprichar no molho..." className="resize-none" value={tempObservation} onChange={e => setTempObservation(e.target.value)} />
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-slate-50 flex items-center gap-4">
                        <div className="flex items-center border rounded-lg bg-white h-12 shadow-sm">
                            <button onClick={() => setItemQuantity(q => Math.max(1, q - 1))} className="px-4 h-full hover:bg-slate-50 text-slate-500">-</button>
                            <span className="w-8 text-center font-bold">{itemQuantity}</span>
                            <button onClick={() => setItemQuantity(q => q + 1)} className="px-4 h-full hover:bg-slate-50 text-slate-500">+</button>
                        </div>
                        <Button className="flex-1 h-12 text-lg font-bold text-white shadow-md hover:brightness-110" style={{ backgroundColor: primaryColor }} onClick={confirmAddToCart}>
                            Adicionar {formatPrice(calculateItemTotal(selectedProduct, tempSelectedAddons) * itemQuantity)}
                        </Button>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
