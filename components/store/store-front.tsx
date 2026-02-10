"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, ShoppingBag, Plus, Minus, Trash2, MapPin, Clock, ArrowRight, Ticket, X, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetDescription // Importante para acessibilidade
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createOrderAction } from "@/app/actions/order"
import { validateCouponAction, incrementCouponUsageAction } from "@/app/actions/coupons"
import { useTheme } from "next-themes"
import Image from "next/image"

interface StoreFrontProps {
  store: any
  categories: any[]
  products: any[]
}

export function StoreFront({ store, categories, products = [] }: StoreFrontProps) {
  const [cart, setCart] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  
  // --- CORREÇÃO 1: Padronizar 'entrega' (Português) para bater com o banco ---
  const [deliveryMethod, setDeliveryMethod] = useState<'entrega' | 'retirada' | 'mesa'>('entrega')
  const [tableNumber, setTableNumber] = useState<string | null>(null)
  
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: store.city || ""
  })
  const [isOrderPlacing, setIsOrderPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)

  const { toast } = useToast()
  const { setTheme } = useTheme()

  // Detecta mesa na URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const mesa = params.get('mesa')
      if (mesa) {
        setDeliveryMethod('mesa')
        setTableNumber(mesa)
        setPaymentMethod('card_machine') 
      }
    }
    if (store.theme_mode) setTheme(store.theme_mode)
  }, [])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setIsCartOpen(true)
    setSelectedProduct(null)
    toast({ title: "Adicionado!", description: `${product.name} foi para a sacola.` })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  // --- CÁLCULOS ---
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      return (subtotal * appliedCoupon.value) / 100;
    }
    return appliedCoupon.value;
  }, [subtotal, appliedCoupon]);

  // Taxa de Entrega (Apenas se for 'entrega')
  const deliveryFee = deliveryMethod === 'entrega' ? (Number(store.delivery_fee) || 5.00) : 0 
  
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const filteredProducts = (products || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "todos" || p.category_id === selectedCategory
    return matchesSearch && matchesCategory && p.is_available
  })

  // --- AÇÕES ---
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    const result = await validateCouponAction(couponCode, store.id, subtotal);
    if (result.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(result.coupon);
      toast({ title: "Cupom Aplicado!", description: `Desconto de ${result.coupon.discount_type === 'percent' ? result.coupon.discount_value + '%' : 'R$ ' + result.coupon.discount_value}` });
    }
    setIsValidatingCoupon(false);
  }

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    if (!customerName) {
      toast({ title: "Faltou o nome", description: "Informe seu nome para o pedido.", variant: "destructive" })
      return
    }
    
    // Telefone obrigatório apenas para entrega/retirada
    if (deliveryMethod !== 'mesa' && !customerPhone) {
      toast({ title: "Faltou o telefone", description: "Informe seu WhatsApp para contato.", variant: "destructive" })
      return
    }

    if (deliveryMethod === 'entrega' && !customerAddress.street) {
        toast({ title: "Endereço incompleto", description: "Informe a rua e número.", variant: "destructive" })
        return
    }

    setIsOrderPlacing(true)

    // Formata endereço
    const fullAddress = deliveryMethod === 'entrega' 
        ? `${customerAddress.street}, ${customerAddress.number} - ${customerAddress.neighborhood} (${customerAddress.city}) ${customerAddress.complement ? ` - ${customerAddress.complement}` : ''}`
        : deliveryMethod === 'mesa' ? `Mesa: ${tableNumber}` : 'Retirada no Balcão';

    // Objeto do pedido (CamelCase para Server Action)
    const orderData = {
      storeId: store.id,
      customerName: customerName,
      customerPhone: customerPhone || "Cliente na Mesa", 
      deliveryType: deliveryMethod, // Agora envia "entrega", "retirada" ou "mesa"
      address: fullAddress,
      tableNumber: tableNumber || undefined,
      paymentMethod: paymentMethod,
      totalPrice: total,
      items: cart.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        removed_ingredients: [],
        selected_addons: [] 
      })),
      notes: appliedCoupon ? `Cupom: ${appliedCoupon.code}` : undefined
    }

    try {
        const result = await createOrderAction(orderData)

        if (result.success) {
          if (appliedCoupon) await incrementCouponUsageAction(appliedCoupon.id);
          setCart([])
          setAppliedCoupon(null)
          setIsCartOpen(false)
          setOrderSuccess({ id: result.orderId })
        } else {
          toast({ title: "Erro no Pedido", description: result.error || "Tente novamente.", variant: "destructive" })
        }
    } catch (e) {
        toast({ title: "Erro de Conexão", description: "Verifique sua internet.", variant: "destructive" })
    } finally {
        setIsOrderPlacing(false)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-zinc-900 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                {store.logo_url ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200">
                        <Image src={store.logo_url} alt={store.name} width={48} height={48} className="object-cover w-full h-full" />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {store.name.substring(0,2).toUpperCase()}
                    </div>
                )}
                <div>
                    <h1 className="font-bold text-lg leading-tight">{store.name}</h1>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="w-3 h-3" /> <span>Aberto</span>
                    </div>
                </div>
             </div>

             <Button variant="outline" size="icon" className="relative" onClick={() => setIsCartOpen(true)}>
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {cart.reduce((a,b) => a + b.quantity, 0)}
                    </span>
                )}
             </Button>
          </div>

          {/* BUSCA E CATEGORIAS */}
          <div className="mt-4 space-y-3">
             <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar produtos..." 
                    className="pl-9 bg-slate-100 dark:bg-zinc-800 border-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             
             <ScrollArea className="w-full whitespace-nowrap pb-2">
                <div className="flex gap-2">
                    <Button variant={selectedCategory === "todos" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("todos")} className="rounded-full">Todos</Button>
                    {categories.map(cat => (
                        <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)} className="rounded-full">{cat.name}</Button>
                    ))}
                </div>
             </ScrollArea>
          </div>
        </div>
      </div>

      {/* PRODUTOS */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
                <div key={product.id} className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-zinc-800 flex gap-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedProduct(product)}>
                    <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        <p className="font-medium text-emerald-600">{formatCurrency(product.price)}</p>
                    </div>
                    {product.image_url && (
                        <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                            <Image src={product.image_url} alt={product.name} width={96} height={96} className="object-cover w-full h-full" />
                        </div>
                    )}
                </div>
            ))}
            {filteredProducts.length === 0 && <div className="col-span-full text-center py-10 text-muted-foreground">Nenhum produto encontrado.</div>}
        </div>
      </div>

      {/* MODAL PRODUTO */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
            {selectedProduct && (
                <>
                    {selectedProduct.image_url && (
                        <div className="w-full h-48 relative">
                             <Image src={selectedProduct.image_url} alt={selectedProduct.name} fill className="object-cover" />
                        </div>
                    )}
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                {selectedProduct.description || "Sem descrição disponível."}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="mt-8 flex items-center justify-between">
                            <span className="text-xl font-bold text-emerald-600">{formatCurrency(selectedProduct.price)}</span>
                            <Button onClick={() => addToCart(selectedProduct)}>Adicionar à Sacola</Button>
                        </div>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* CHECKOUT (SHEET) */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-slate-50 dark:bg-zinc-950">
            <SheetHeader className="p-6 bg-white dark:bg-zinc-900 shadow-sm">
                <SheetTitle>Sua Sacola</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">Confira seus itens antes de finalizar.</SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6 py-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-20">
                        <ShoppingBag className="w-12 h-12 opacity-20" />
                        <p>Sua sacola está vazia</p>
                        <Button variant="link" onClick={() => setIsCartOpen(false)}>Ver Cardápio</Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* BANNER MESA */}
                        {tableNumber && (
                             <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full">
                                    <Utensils className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-800 dark:text-emerald-200">Mesa {tableNumber}</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">O pedido será entregue na sua mesa.</p>
                                </div>
                             </div>
                        )}

                        {/* ITENS */}
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-100 dark:border-zinc-800">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 rounded-md p-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                                        <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => updateQuantity(item.id, -item.quantity)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>

                        <Separator />
                        
                        {/* CUPOM (Só mostra se não for mesa) */}
                        {!tableNumber && (
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-slate-100 dark:border-zinc-800 space-y-3">
                                <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                                    <Ticket className="w-4 h-4" /> Cupom
                                </Label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-3 rounded border border-emerald-100 dark:border-emerald-800">
                                        <div className="flex flex-col"><span className="font-bold text-sm">{appliedCoupon.code}</span><span className="text-xs">Aplicado</span></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-700 hover:bg-emerald-100" onClick={removeCoupon}><X className="w-4 h-4" /></Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input placeholder="Código" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="uppercase font-bold" />
                                        <Button variant="secondary" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode}>{isValidatingCoupon ? "..." : "Aplicar"}</Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator />

                        {/* DADOS */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Seus Dados</h3>
                            <Input placeholder="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            
                            {!tableNumber && (
                                <>
                                    <Input placeholder="WhatsApp" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                    
                                    <RadioGroup value={deliveryMethod} onValueChange={(v: any) => setDeliveryMethod(v)} className="grid grid-cols-2 gap-4">
                                        <div className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:bg-slate-50 ${deliveryMethod === 'entrega' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setDeliveryMethod('entrega')}>
                                            <RadioGroupItem value="entrega" id="entrega" className="sr-only" />
                                            <MapPin className="mb-2 h-6 w-6" /><span className="text-xs font-medium">Entrega</span>
                                        </div>
                                        <div className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:bg-slate-50 ${deliveryMethod === 'retirada' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setDeliveryMethod('retirada')}>
                                            <RadioGroupItem value="retirada" id="retirada" className="sr-only" />
                                            <ShoppingBag className="mb-2 h-6 w-6" /><span className="text-xs font-medium">Retirar</span>
                                        </div>
                                    </RadioGroup>

                                    {deliveryMethod === 'entrega' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-4 gap-2">
                                                <Input className="col-span-3" placeholder="Rua" value={customerAddress.street} onChange={e => setCustomerAddress({...customerAddress, street: e.target.value})} />
                                                <Input className="col-span-1" placeholder="Nº" value={customerAddress.number} onChange={e => setCustomerAddress({...customerAddress, number: e.target.value})} />
                                            </div>
                                            <Input placeholder="Bairro" value={customerAddress.neighborhood} onChange={e => setCustomerAddress({...customerAddress, neighborhood: e.target.value})} />
                                            <Input placeholder="Complemento" value={customerAddress.complement} onChange={e => setCustomerAddress({...customerAddress, complement: e.target.value})} />
                                        </div>
                                    )}
                                    
                                    <div className="space-y-3 pt-2">
                                        <h3 className="font-semibold text-sm">Pagamento</h3>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pix">PIX</SelectItem>
                                                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                                                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                                                <SelectItem value="money">Dinheiro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </ScrollArea>

            {cart.length > 0 && (
                <SheetFooter className="p-6 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex-col gap-4 sm:flex-col sm:space-x-0">
                    <div className="space-y-1.5 w-full text-sm">
                        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        
                        {discountAmount > 0 && (
                             <div className="flex justify-between text-emerald-600 font-medium"><span>Desconto</span><span>- {formatCurrency(discountAmount)}</span></div>
                        )}

                        {!tableNumber && (
                            <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>{deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)}</span></div>
                        )}
                        
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
                    </div>
                    <Button size="lg" className="w-full font-bold text-base" onClick={handleCheckout} disabled={isOrderPlacing}>
                        {isOrderPlacing ? "Enviando..." : "ENVIAR PEDIDO"}
                    </Button>
                </SheetFooter>
            )}
        </SheetContent>
      </Sheet>

      {/* SUCESSO */}
      <Dialog open={!!orderSuccess} onOpenChange={() => setOrderSuccess(null)}>
        <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
                <DialogTitle className="text-center text-2xl text-green-700">Pedido Recebido!</DialogTitle>
                <DialogDescription className="text-center">
                    {tableNumber ? "O garçom já recebeu seu pedido. Logo chega aí!" : "Acompanhe seu pedido pelo WhatsApp."}
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 animate-in zoom-in"><Clock className="w-8 h-8" /></div>
                <div className="bg-slate-100 p-4 rounded-lg text-sm w-full">
                    <p className="font-bold">Pedido #{orderSuccess?.id?.slice(0,4)}</p>
                    <p className="text-muted-foreground mt-1">Total: {formatCurrency(total)}</p>
                </div>
                <Button className="w-full mt-2" onClick={() => setOrderSuccess(null)}>Fazer outro pedido</Button>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
