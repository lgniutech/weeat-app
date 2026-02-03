"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  ShoppingBag, 
  Search, 
  X, 
  Check, 
  MessageSquare, 
  Plus, 
  Bike, 
  Store, 
  MapPin, 
  Loader2, 
  Package, 
  Clock, 
  ChevronRight, 
  Ban, 
  AlertCircle, 
  ArrowRight, 
  Utensils, 
  Wallet 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn, formatPhone, cleanPhone } from "@/lib/utils"
import { createOrderAction } from "@/app/actions/order"

// --- INTERFACES DE DADOS ---

interface Ingredient {
  id: string
  name: string
}

interface Addon {
  id: string
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  ingredients?: Ingredient[]
  addons?: Addon[]
  is_available: boolean
}

interface CartItem extends Product {
  quantity: number
  cartId: string
  removedIngredients: string[]
  selectedAddons: string[]
  observation: string
  totalPrice: number
}

interface CheckoutData {
  name: string
  phone: string
  deliveryType: "entrega" | "retirada" | "mesa"
  tableNumber?: string
  cep: string
  street: string
  number: string
  neighborhood: string
  city: string
  complement: string
  paymentMethod: "pix" | "cartao" | "dinheiro" | "caixa"
  changeFor: string
  state?: string
}

// --- COMPONENTE PRINCIPAL ---

export function StoreFront({ store, categories }: { store: any, categories: any[] }) {
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()
  const { setTheme } = useTheme()

  // --- 1. FORÇAR MODO CLARO (LIGHT MODE) ---
  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  // --- ESTADOS GERAIS ---
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  // Parametro de Mesa (?mesa=5)
  const tableParam = searchParams.get("mesa")
  const isTableSession = !!tableParam

  // --- ESTADOS DO CHECKOUT ---
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart")
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: "",
    phone: "",
    deliveryType: isTableSession ? "mesa" : "entrega",
    tableNumber: tableParam || "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    complement: "",
    // Para mesa, definimos "caixa" automaticamente
    paymentMethod: isTableSession ? "caixa" : "pix",
    changeFor: "",
    state: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  // --- ESTADOS DO PRODUTO SELECIONADO (MODAL) ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [tempObservation, setTempObservation] = useState("")
  const [tempRemovedIngredients, setTempRemovedIngredients] = useState<string[]>([])
  const [tempSelectedAddons, setTempSelectedAddons] = useState<string[]>([])
  const [itemQuantity, setItemQuantity] = useState(1)

  // --- CÁLCULO DE FRETE ---
  const [calculatedFee, setCalculatedFee] = useState(0)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [calcStatus, setCalcStatus] = useState<string>("")

  // --- CONFIGURAÇÕES DA LOJA ---
  const banners = (store.banners && store.banners.length > 0) 
    ? store.banners 
    : (store.banner_url ? [store.banner_url] : [])
    
  const fontFamily = store.font_family || "Inter"
  const primaryColor = store.primary_color || "#ea1d2c"

  // CORREÇÃO: Prepara a URL da fonte fora do JSX para evitar erro de parse
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;700&display=swap`

  const settings = store.settings || {}
  const deliveryFeeMode = settings.delivery_fee_mode || 'fixed'
  const fixedFee = Number(settings.delivery_fee) || 0
  const pricePerKm = Number(settings.price_per_km) || 0
  const minimumOrder = Number(settings.minimum_order) || 0

  const storeLat = settings.location?.lat ? Number(settings.location.lat) : null
  const storeLng = settings.location?.lng ? Number(settings.location.lng) : null

  // --- EFEITOS (Inicialização e Persistência) ---

  useEffect(() => {
    setIsMounted(true)
    
    const savedCart = localStorage.getItem(`cart-${store.id}`)
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)) } catch (e) { console.error(e) }
    }

    const savedData = localStorage.getItem(`checkout-${store.id}`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (isTableSession) {
          setCheckoutData(prev => ({
            ...prev,
            name: parsed.name,
            phone: parsed.phone,
            deliveryType: "mesa",
            tableNumber: tableParam!,
            paymentMethod: "caixa"
          }))
        } else {
          setCheckoutData(prev => ({
            ...prev,
            ...parsed,
            // Garante que se não for mesa, volta para um método padrão se estiver "caixa"
            paymentMethod: (parsed.paymentMethod === 'caixa') ? "pix" : parsed.paymentMethod,
            changeFor: ""
          }))
        }
      } catch (e) { console.error(e) }
    } else if (isTableSession) {
        // Se não tem dados salvos mas é mesa, força "caixa"
        setCheckoutData(prev => ({ ...prev, paymentMethod: "caixa" }))
    }
  }, [store.id, isTableSession, tableParam])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(`cart-${store.id}`, JSON.stringify(cart))
    }
  }, [cart, isMounted, store.id])

  useEffect(() => {
    if (isMounted) {
      const { paymentMethod, changeFor, ...safeData } = checkoutData
      localStorage.setItem(`checkout-${store.id}`, JSON.stringify(safeData))
    }
  }, [checkoutData, isMounted, store.id])

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [banners.length])

  useEffect(() => {
    if (checkoutData.deliveryType === 'retirada' || checkoutData.deliveryType === 'mesa') {
      setCalculatedFee(0)
      setCalcStatus("")
      return
    }

    if (deliveryFeeMode === 'fixed') {
      setCalculatedFee(fixedFee)
      setCalcStatus("")
      return
    }

    if (distanceKm === null) {
      setCalculatedFee(fixedFee)
      if (checkoutData.cep.length >= 8) {
        setCalcStatus("Aguardando cálculo...")
      }
    } else {
      let fee = 0
      if (deliveryFeeMode === 'fixed_plus_km') {
        fee += fixedFee
      }
      const kmFee = distanceKm * pricePerKm
      fee += kmFee
      
      setCalculatedFee(fee)
      setCalcStatus(`Distância: ${distanceKm.toFixed(1)}km`)
    }
  }, [checkoutData.deliveryType, distanceKm, deliveryFeeMode, fixedFee, pricePerKm, checkoutData.cep])

  // --- HELPERS ---

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c
    return d
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
  }

  const activeDays = settings.business_hours?.filter((h: any) => h.active) || []
  
  const isOpenNow = useMemo(() => {
    const now = new Date()
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const currentDay = days[now.getDay()]
    
    const todayConfig = activeDays.find((d: any) => d.day === currentDay)
    if (!todayConfig) return false

    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [openHour, openMin] = todayConfig.open.split(':').map(Number)
    const [closeHour, closeMin] = todayConfig.close.split(':').map(Number)
    
    const openTime = openHour * 60 + openMin
    const closeTime = closeHour * 60 + closeMin
    
    return currentTime >= openTime && currentTime <= closeTime
  }, [activeDays])

  // --- MANIPULAÇÃO DO CARRINHO ---

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
    setTempRemovedIngredients(prev => 
      prev.includes(ingId) 
        ? prev.filter(id => id !== ingId) 
        : [...prev, ingId]
    )
  }

  const toggleAddon = (addonId: string) => {
    setTempSelectedAddons(prev => 
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  // --- BUSCA DE CEP E CÁLCULO DE DISTÂNCIA ---

  const handleCepBlur = async () => {
    const cleanCep = checkoutData.cep.replace(/\D/g, "")
    if (cleanCep.length === 8) {
      setIsLoadingCep(true)
      setDistanceKm(null)
      setCalcStatus("Buscando endereço...")
      
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        
        if (!data.erro) {
          setCheckoutData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }))
          
          document.getElementById("checkout-number")?.focus()

          if (storeLat && storeLng) {
            setCalcStatus("Calculando distância...")
            
            const queryHighPrec = `${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryHighPrec)}&limit=1`)
            const geoData = await geoRes.json()
            
            let userLat = null
            let userLng = null

            if (geoData && geoData.length > 0) {
              userLat = Number(geoData[0].lat)
              userLng = Number(geoData[0].lon)
            } else {
              const queryLowPrec = `${cleanCep}, Brasil`
              const cepRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryLowPrec)}&limit=1`)
              const cepData = await cepRes.json()
              
              if (cepData && cepData.length > 0) {
                userLat = Number(cepData[0].lat)
                userLng = Number(cepData[0].lon)
              }
            }

            if (userLat && userLng) {
              const dist = getDistanceFromLatLonInKm(storeLat, storeLng, userLat, userLng)
              setDistanceKm(dist)
              setCalcStatus(`Distância: ${dist.toFixed(1)}km`)
            } else {
              setCalcStatus("Não foi possível calcular a distância.")
            }
          } else {
            setCalcStatus("Loja sem localização exata.")
          }

        } else {
          setCalcStatus("CEP não encontrado.")
        }
      } catch (e) {
        setCalcStatus("Erro ao calcular.")
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  // --- FINALIZAÇÃO DO PEDIDO ---

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.totalPrice * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const finalTotal = cartSubtotal + calculatedFee
  
  const remainingForMinimum = isTableSession ? 0 : Math.max(0, minimumOrder - cartSubtotal)
  const isBelowMinimum = isTableSession ? false : cartSubtotal < minimumOrder

  const handleFinishOrder = async () => {
    if (isTableSession) {
        if (!checkoutData.name) return alert("Por favor, informe seu nome para a cozinha.")
    } else {
        if (!checkoutData.name || !checkoutData.phone) return alert("Por favor, preencha seu nome e telefone.")
    }
    
    let fullAddress = ""
    
    if (checkoutData.deliveryType === 'entrega') {
      if (!checkoutData.street || !checkoutData.number || !checkoutData.neighborhood) {
        return alert("Por favor, preencha o endereço completo.")
      }
      
      if (store.city && checkoutData.city) {
        if (store.city.toLowerCase().trim() !== checkoutData.city.toLowerCase().trim()) {
          return alert(`Desculpe, esta loja só realiza entregas em ${store.city}.`)
        }
      }

      fullAddress = `${checkoutData.street}, ${checkoutData.number} - ${checkoutData.neighborhood}, ${checkoutData.city}. CEP: ${checkoutData.cep}. ${checkoutData.complement}`
    } else if (checkoutData.deliveryType === 'retirada') {
      fullAddress = "Retirada no Balcão"
    } else {
      fullAddress = `Mesa ${checkoutData.tableNumber}`
    }

    setIsSubmitting(true)

    const formattedItems = cart.map(item => ({
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.totalPrice,
      observation: item.observation,
      removed_ingredients: item.ingredients?.filter(i => item.removedIngredients.includes(i.id)).map(i => i.name) || [],
      selected_addons: item.addons?.filter(a => item.selectedAddons.includes(a.id)).map(a => ({ name: a.name, price: a.price })) || []
    }))

    const res = await createOrderAction({
      storeId: store.id,
      customerName: checkoutData.name,
      customerPhone: cleanPhone(checkoutData.phone || "00000000000"),
      deliveryType: checkoutData.deliveryType,
      tableNumber: checkoutData.tableNumber,
      address: fullAddress,
      // Força "caixa" se for mesa, para garantir
      paymentMethod: isTableSession ? 'caixa' : checkoutData.paymentMethod,
      changeFor: checkoutData.changeFor,
      totalPrice: finalTotal,
      items: formattedItems
    })

    setIsSubmitting(false)

    if (res.success) {
      setStep("success")
      setCart([])
      localStorage.removeItem(`cart-${store.id}`)
    } else {
      alert("Erro ao enviar pedido. Tente novamente.")
    }
  }

  // --- FILTROS DE BUSCA ---
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

  const storeAddress = useMemo(() => {
    if (store.street && store.number) {
        return `${store.street}, ${store.number} - ${store.neighborhood}, ${store.city}`
    }
    return store.city ? `${store.city} - ${store.state}` : "Localização da loja"
  }, [store])

  const isCityMismatch = useMemo(() => {
      if (isTableSession) return false
      if (!store.city || !checkoutData.city) return false
      return store.city.toLowerCase().trim() !== checkoutData.city.toLowerCase().trim()
  }, [store.city, checkoutData.city, isTableSession])

  if (!isMounted) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 light" style={{ fontFamily: fontFamily }} data-theme="light">
      <style jsx global>{`
        @import url('${fontUrl}');
      `}</style>
      
      {/* HEADER */}
      <div className="relative w-full bg-slate-900 overflow-hidden">
        {!isTableSession && (
            <Link href="/rastreio" className="absolute top-4 right-4 z-30">
                <Button size="sm" className="bg-white/90 text-slate-900 hover:bg-white border-0 shadow-lg backdrop-blur-sm font-bold gap-2 transition-all hover:scale-105">
                    <Package className="w-4 h-4" /> 
                    <span className="hidden sm:inline">Acompanhar Pedido</span>
                </Button>
            </Link>
        )}

        {isTableSession && (
             <div className="absolute top-4 left-4 z-30 bg-blue-600 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 animate-pulse">
                <Utensils className="w-4 h-4" /> Mesa {tableParam}
             </div>
        )}

        <div className="relative h-[40vh] md:h-[350px] w-full">
            {banners.length > 0 ? banners.map((img: string, index: number) => (
                <div key={index} className={cn("absolute inset-0 transition-opacity duration-1000", index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0")}>
                    <img src={img} alt="Banner" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </div>
            )) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <span className="text-white/30 text-sm">Sem Imagens</span>
                </div>
            )}
        </div>

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
                    <h1 className="text-2xl md:text-4xl font-bold drop-shadow-lg leading-none tracking-tight">{store.name}</h1>
                    {store.bio && (
                        <p className="text-white/90 text-xs md:text-sm line-clamp-2 mt-1 drop-shadow-md max-w-xl font-medium">
                            {store.bio}
                        </p>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* BARRA DE INFO */}
      <div className="bg-white border-b border-slate-100 shadow-sm relative z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex justify-between gap-3">
              <button onClick={() => setIsInfoOpen(true)} className="flex items-center gap-2 group text-left hover:bg-slate-50 p-1.5 -ml-1.5 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                      <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</span>
                      <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1 max-w-[250px] md:max-w-md">{storeAddress}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                  </div>
              </button>
              
              <div className="flex items-center gap-3">
                  <div className={cn("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5", isOpenNow ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      <Clock className="w-3.5 h-3.5" />
                      {isOpenNow ? "Loja Aberta" : "Loja Fechada"}
                  </div>
              </div>
          </div>
      </div>

      {/* BUSCA */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 md:px-8 py-3 max-w-7xl mx-auto space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Buscar produtos..." 
                    className="pl-9 bg-slate-100 border-transparent focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
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
                            className="px-5 py-2 rounded-full text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors active:scale-95"
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
        </div>
      </div>

      {/* PRODUTOS */}
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
                                className={cn(
                                    "flex bg-white rounded-2xl border border-slate-100 shadow-sm p-3 gap-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]",
                                    !product.is_available && "opacity-60 grayscale"
                                )}
                                onClick={() => product.is_available && handleProductClick(product)}
                            >
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 
                                            className="font-bold text-slate-900 line-clamp-2 text-base group-hover:text-[var(--primary)] transition-colors"
                                            style={{ '--primary': primaryColor } as any}
                                        >
                                            {product.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                            {product.description}
                                        </p>
                                    </div>
                                    <div className="mt-3 font-bold text-lg text-slate-900">
                                        {formatPrice(product.price)}
                                        {!product.is_available && (
                                            <span className="ml-2 text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">Esgotado</span>
                                        )}
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

      {/* BOTÃO FLUTUANTE */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40">
            <Button 
                className="w-full max-w-md h-16 rounded-full shadow-2xl text-white flex items-center justify-between px-8 text-lg animate-in slide-in-from-bottom-4 hover:brightness-110 active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setIsCartOpen(true)}
            >
                <div className="flex items-center gap-3">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">{cartCount}</span>
                    <span className="font-bold tracking-wide">Ver Sacola</span>
                </div>
                <span className="font-bold text-xl">{formatPrice(cartSubtotal)}</span>
            </Button>
        </div>
      )}

      {/* SHEET DO CARRINHO */}
      <Sheet open={isCartOpen} onOpenChange={(open) => { setIsCartOpen(open); if(!open) setTimeout(() => setStep("cart"), 300); }}>
        <SheetContent className="w-full sm:max-w-md bg-slate-50 p-0 flex flex-col h-[100dvh] light text-slate-900" style={{ fontFamily: fontFamily }} data-theme="light">
            
            {step === "cart" && (
                <>
                    <SheetHeader className="p-5 border-b bg-white shrink-0">
                        <SheetTitle className="flex items-center gap-3 text-xl text-slate-900">
                            <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
                            Sua Sacola
                        </SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                                    <ShoppingBag className="w-10 h-10 opacity-20" />
                                </div>
                                <p className="font-medium text-lg">Sua sacola está vazia</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map((item) => (
                                    <div key={item.cartId} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                                <p className="text-sm font-bold text-slate-900">{formatPrice(item.totalPrice * item.quantity)}</p>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 space-y-1">
                                                {item.removedIngredients.length > 0 && (
                                                    <p className="text-red-500/80"><span className="font-medium text-red-600">Sem:</span> {item.ingredients?.filter(i => item.removedIngredients.includes(i.id)).map(i => i.name).join(", ")}</p>
                                                )}
                                                {item.selectedAddons.length > 0 && (
                                                    <p className="text-green-600"><span className="font-medium">Mais:</span> {item.addons?.filter(a => item.selectedAddons.includes(a.id)).map(a => `${a.name}`).join(", ")}</p>
                                                )}
                                                {item.observation && (
                                                    <p className="italic">&quot;{item.observation}&quot;</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 pl-2">
                                            <div className="flex items-center border border-slate-200 rounded-lg h-8 bg-slate-50">
                                                <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeFromCart(item.cartId)} className="w-8 h-full flex items-center justify-center hover:bg-white text-slate-500 rounded-l-lg hover:text-red-500 transition-colors">-</button>
                                                <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-full flex items-center justify-center hover:bg-white text-slate-500 rounded-r-lg hover:text-green-600 transition-colors">+</button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.cartId)} className="text-[10px] text-red-400 hover:text-red-600 underline decoration-dashed">Remover</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-white border-t space-y-4 pb-safe shrink-0 z-20">
                        {isBelowMinimum && cart.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-start gap-3 animate-in slide-in-from-bottom-2">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-orange-800 uppercase mb-1">Mínimo: {formatPrice(minimumOrder)}</p>
                                    <p className="text-sm text-orange-700">Falta <b>{formatPrice(remainingForMinimum)}</b> para fechar.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl text-slate-900">
                            <span>Total</span>
                            <span>{formatPrice(cartSubtotal)}</span>
                        </div>
                        <Button 
                            className="w-full h-14 text-lg font-bold text-white hover:brightness-110 shadow-lg active:scale-[0.99] transition-all" 
                            style={{ backgroundColor: isBelowMinimum ? '#94a3b8' : primaryColor }}
                            disabled={cart.length === 0 || isBelowMinimum}
                            onClick={() => setStep("checkout")}
                        >
                            {isBelowMinimum ? "Complete o valor mínimo" : "Continuar"}
                        </Button>
                    </div>
                </>
            )}

            {step === "checkout" && (
                <>
                    <SheetHeader className="p-5 border-b bg-white flex flex-row items-center gap-3 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-slate-900" onClick={() => setStep("cart")}>
                            <X className="h-4 w-4" />
                        </Button>
                        <SheetTitle className="text-xl text-slate-900">Finalizar Pedido</SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 overflow-y-auto p-5 bg-white">
                        <div className="space-y-6 pb-4">
                            
                            {isTableSession && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <Utensils className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-blue-600 font-medium">Você está pedindo na</p>
                                        <p className="text-xl font-bold text-blue-800">Mesa {tableParam}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">1</div> 
                                    Seus Dados
                                </h3>
                                <div className="grid gap-3 pl-8">
                                    <div>
                                        <Label className="text-slate-900">Nome</Label>
                                        <Input 
                                            placeholder="Como podemos te chamar?" 
                                            value={checkoutData.name} 
                                            onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} 
                                            className="bg-white border-slate-200 text-slate-900"
                                        />
                                    </div>
                                    {!isTableSession && (
                                        <div>
                                            <Label className="text-slate-900">Celular</Label>
                                            <Input 
                                                placeholder="(00) 00000-0000" 
                                                value={checkoutData.phone} 
                                                onChange={e => setCheckoutData({...checkoutData, phone: formatPhone(e.target.value)})} 
                                                maxLength={15}
                                                className="bg-white border-slate-200 text-slate-900"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isTableSession && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">2</div> 
                                        Entrega
                                    </h3>
                                    <div className="pl-8 space-y-3">
                                        <RadioGroup value={checkoutData.deliveryType} onValueChange={(v: any) => setCheckoutData({...checkoutData, deliveryType: v})} className="grid grid-cols-2 gap-3">
                                            <Label className={cn("flex flex-col items-center justify-center border-2 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all", checkoutData.deliveryType === 'entrega' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-900")}>
                                                <RadioGroupItem value="entrega" className="sr-only" />
                                                <Bike className="mb-2 h-6 w-6" />
                                                <span className="font-bold">Entrega</span>
                                            </Label>
                                            <Label className={cn("flex flex-col items-center justify-center border-2 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all", checkoutData.deliveryType === 'retirada' ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-900")}>
                                                <RadioGroupItem value="retirada" className="sr-only" />
                                                <Store className="mb-2 h-6 w-6" />
                                                <span className="font-bold">Retirada</span>
                                                <span className="text-xs mt-1 text-green-600 font-medium">Grátis</span>
                                            </Label>
                                        </RadioGroup>

                                        {checkoutData.deliveryType === 'entrega' && (
                                            <div className="animate-in slide-in-from-top-2 fade-in space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="space-y-1">
                                                    <Label className="text-slate-900">CEP</Label>
                                                    <div className="relative">
                                                        <Input 
                                                            placeholder="00000-000" 
                                                            value={checkoutData.cep} 
                                                            onChange={e => { let v = e.target.value.replace(/\D/g, "").slice(0, 8); v = v.replace(/^(\d{5})(\d)/, "$1-$2"); setCheckoutData({...checkoutData, cep: v}); }} 
                                                            onBlur={handleCepBlur} 
                                                            className="bg-white border-slate-200 text-slate-900"
                                                        />
                                                        {isLoadingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                                                    </div>
                                                </div>

                                                {isCityMismatch && (
                                                    <div className="bg-red-50 border border-red-200 p-3 rounded-md flex gap-2 text-red-800 text-xs">
                                                        <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <span><b>Entrega Indisponível:</b> A loja não entrega em {checkoutData.city}.</span>
                                                    </div>
                                                )}

                                                {calcStatus && !isCityMismatch && (
                                                    <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs text-blue-800 flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 animate-pulse" />
                                                        {calcStatus}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-4 gap-2">
                                                    <div className="col-span-3 space-y-1">
                                                        <Label className="text-slate-900">Rua</Label>
                                                        <Input placeholder="Rua" value={checkoutData.street} onChange={e => setCheckoutData({...checkoutData, street: e.target.value})} className="bg-white border-slate-200 text-slate-900" />
                                                    </div>
                                                    <div className="col-span-1 space-y-1">
                                                        <Label className="text-slate-900">Nº</Label>
                                                        <Input id="checkout-number" placeholder="123" value={checkoutData.number} onChange={e => setCheckoutData({...checkoutData, number: e.target.value})} className="bg-white border-slate-200 text-slate-900" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-slate-900">Bairro</Label>
                                                    <Input placeholder="Bairro" value={checkoutData.neighborhood} onChange={e => setCheckoutData({...checkoutData, neighborhood: e.target.value})} className="bg-white border-slate-200 text-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-slate-900">Complemento</Label>
                                                    <Input placeholder="Apto, Bloco..." value={checkoutData.complement} onChange={e => setCheckoutData({...checkoutData, complement: e.target.value})} className="bg-white border-slate-200 text-slate-900" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                                        {isTableSession ? "2" : "3"}
                                    </div> 
                                    Pagamento
                                </h3>
                                <div className="pl-8 space-y-3">
                                    {isTableSession ? (
                                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-4">
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-orange-800 text-sm">Pagamento no Balcão</p>
                                                <p className="text-xs text-orange-700 mt-0.5">O pagamento será realizado ao finalizar.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <RadioGroup value={checkoutData.paymentMethod} onValueChange={(v: any) => setCheckoutData({...checkoutData, paymentMethod: v})} className="space-y-2">
                                            <div className="flex items-center space-x-2 border border-slate-200 p-3 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <RadioGroupItem value="pix" id="pix" />
                                                <Label htmlFor="pix" className="flex-1 cursor-pointer font-medium text-slate-900">Pix</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 border border-slate-200 p-3 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <RadioGroupItem value="cartao" id="cartao" />
                                                <Label htmlFor="cartao" className="flex-1 cursor-pointer font-medium text-slate-900">Cartão</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 border border-slate-200 p-3 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <RadioGroupItem value="dinheiro" id="dinheiro" />
                                                <Label htmlFor="dinheiro" className="flex-1 cursor-pointer font-medium text-slate-900">Dinheiro</Label>
                                            </div>
                                        </RadioGroup>
                                    )}

                                    {checkoutData.paymentMethod === 'dinheiro' && !isTableSession && (
                                        <div className="animate-in slide-in-from-top-2 fade-in">
                                            <Label className="text-slate-900">Troco para quanto?</Label>
                                            <Input 
                                                placeholder="Ex: R$ 50,00" 
                                                value={checkoutData.changeFor} 
                                                onChange={e => setCheckoutData({...checkoutData, changeFor: e.target.value})} 
                                                className="mt-1.5 bg-white border-slate-200 text-slate-900" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-white border-t space-y-4 pb-safe shrink-0 z-20">
                        <div className="space-y-1 text-sm text-slate-500 pb-2 border-b border-dashed border-slate-200">
                             <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatPrice(cartSubtotal)}</span>
                             </div>
                             {!isTableSession && (
                                 <div className="flex justify-between">
                                    <span>Entrega</span>
                                    <span className={checkoutData.deliveryType === 'entrega' ? "text-slate-900" : "text-green-600"}>
                                        {checkoutData.deliveryType === 'entrega' 
                                            ? (calculatedFee > 0 ? formatPrice(calculatedFee) : (deliveryFeeMode !== 'fixed' && distanceKm === null ? "Calculando..." : "Grátis"))
                                            : "Grátis"
                                        }
                                    </span>
                                 </div>
                             )}
                        </div>
                        <div className="flex justify-between font-bold text-xl text-slate-900">
                            <span>Total</span>
                            <span>{formatPrice(finalTotal)}</span>
                        </div>
                        
                        <Button 
                            className="w-full h-14 text-lg font-bold text-white hover:brightness-110 shadow-lg active:scale-[0.99] transition-all" 
                            style={{ backgroundColor: primaryColor }}
                            onClick={handleFinishOrder}
                            disabled={isSubmitting || (checkoutData.deliveryType === 'entrega' && isCityMismatch)}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (isTableSession ? "Pedir para Mesa" : "Enviar Pedido")}
                        </Button>
                    </div>
                </>
            )}

            {step === "success" && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-lg shadow-green-100">
                        <Check className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Pedido Enviado!</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        {isTableSession 
                            ? "A cozinha já recebeu seu pedido. Aguarde na mesa." 
                            : "A loja já recebeu seu pedido e logo começará o preparo."
                        }
                    </p>
                    
                    {!isTableSession && (
                        <Link href="/rastreio" className="w-full mt-4">
                            <Button variant="default" className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg">
                                Acompanhar Pedido
                            </Button>
                        </Link>
                    )}
                    
                    <Button 
                        variant="outline" 
                        className="w-full h-12 border-2 font-bold mt-2 hover:bg-slate-50 text-slate-900 border-slate-200"
                        onClick={() => { setIsCartOpen(false); setStep("cart"); }}
                    >
                        Fazer Outro Pedido
                    </Button>
                </div>
            )}
        </SheetContent>
      </Sheet>

      {/* MODAL DE DETALHES DO PRODUTO */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-none sm:rounded-2xl h-[100dvh] sm:h-auto light text-slate-900 bg-white" data-theme="light">
            {selectedProduct && (
                <>
                    <div className="relative h-48 w-full bg-slate-100 shrink-0">
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

                    <ScrollArea className="flex-1 -mx-px sm:max-h-[60vh]">
                        <div className="p-6 space-y-6">
                            <div>
                                <DialogTitle className="text-2xl font-bold leading-tight text-slate-900">{selectedProduct.name}</DialogTitle>
                                <DialogDescription className="text-base text-slate-500 mt-2 leading-relaxed">{selectedProduct.description}</DialogDescription>
                            </div>

                            {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                        Ingredientes <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full lowercase">Remova o que não quiser</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedProduct.ingredients.map(ing => {
                                            const isRemoved = tempRemovedIngredients.includes(ing.id);
                                            return (
                                                <div 
                                                    key={ing.id} 
                                                    onClick={() => toggleIngredient(ing.id)} 
                                                    className={cn("flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer", isRemoved ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white shadow-sm border-slate-200")}
                                                    style={{ borderColor: !isRemoved ? `${primaryColor}40` : undefined }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors text-white", isRemoved ? "bg-slate-200" : "")}
                                                            style={{ backgroundColor: !isRemoved ? primaryColor : undefined }}
                                                        >
                                                            {!isRemoved && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className={cn("font-medium text-slate-900", isRemoved && "text-slate-500 line-through decoration-slate-400")}>{ing.name}</span>
                                                    </div>
                                                    {!isRemoved && <span className="text-xs font-medium" style={{ color: primaryColor }}>Incluso</span>}
                                                    {isRemoved && <span className="text-xs text-slate-400">Removido</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                        Turbine seu pedido <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full lowercase">Escolha extras</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedProduct.addons.map(adon => {
                                            const isSelected = tempSelectedAddons.includes(adon.id);
                                            return (
                                                <div 
                                                    key={adon.id} 
                                                    onClick={() => toggleAddon(adon.id)} 
                                                    className={cn("flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer", isSelected ? "bg-yellow-50 border-yellow-500 shadow-sm" : "bg-white border-slate-100")}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-yellow-500 border-yellow-500 text-white" : "border-slate-300")}>
                                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="font-medium text-slate-900">{adon.name}</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700">+ {formatPrice(adon.price)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pb-safe">
                                <Label className="flex items-center gap-2 text-slate-900"><MessageSquare className="w-4 h-4" /> Alguma observação?</Label>
                                <Textarea 
                                    placeholder="Ex: Tocar a campainha, caprichar no molho..." 
                                    className="resize-none bg-white border-slate-200 text-slate-900" 
                                    value={tempObservation} 
                                    onChange={e => setTempObservation(e.target.value)} 
                                />
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-slate-50 flex items-center gap-4 shrink-0 z-20 pb-safe">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white h-12 shadow-sm">
                            <button onClick={() => setItemQuantity(q => Math.max(1, q - 1))} className="px-4 h-full hover:bg-slate-50 text-slate-500 active:bg-slate-100 rounded-l-lg">-</button>
                            <span className="w-8 text-center font-bold text-slate-900">{itemQuantity}</span>
                            <button onClick={() => setItemQuantity(q => q + 1)} className="px-4 h-full hover:bg-slate-50 text-slate-500 active:bg-slate-100 rounded-r-lg">+</button>
                        </div>
                        <Button 
                            className="flex-1 h-12 text-lg font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all" 
                            style={{ backgroundColor: primaryColor }}
                            onClick={confirmAddToCart}
                        >
                            Adicionar {formatPrice(calculateItemTotal(selectedProduct, tempSelectedAddons) * itemQuantity)}
                        </Button>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE INFORMAÇÕES DA LOJA */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-md light bg-white text-slate-900" data-theme="light">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                    <Store className="w-5 h-5 text-primary" /> Informações da Loja
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-2">
                <div className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-bold text-sm text-slate-900">Endereço</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            {storeAddress}
                            {store.zip_code && <span className="block text-xs text-slate-400 mt-0.5">CEP: {store.zip_code}</span>}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Horários de Funcionamento
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {activeDays.length > 0 ? activeDays.map((day: any, index: number) => (
                            <div key={index} className="bg-slate-50 p-2 rounded text-xs border border-slate-200 flex flex-col justify-center">
                                <span className="font-bold text-slate-700">{day.day}</span>
                                <span className="text-slate-500">{day.open} - {day.close}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 italic">Fechado.</p>
                        )}
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
