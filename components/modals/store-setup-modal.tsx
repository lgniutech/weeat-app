"use client"

import { useActionState, useState, useEffect } from "react"
import { updateStoreAction } from "@/app/actions/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Save, Store, Phone, FileText, Clock, User, Lock, Settings, MapPin, DollarSign, CheckCircle2, Car } from "lucide-react"

interface StoreSettingsModalProps {
  store: any
  userName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function StoreSettingsModal({ store, userName, isOpen, onOpenChange }: StoreSettingsModalProps) {
  const [state, action, isPending] = useActionState(updateStoreAction, null)
  
  // States Básicos
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")
  
  // States de Valores e Modos
  const [deliveryFeeMode, setDeliveryFeeMode] = useState("fixed") // fixed, per_km, fixed_plus_km
  const [deliveryFee, setDeliveryFee] = useState("")
  const [pricePerKm, setPricePerKm] = useState("")
  const [minimumOrder, setMinimumOrder] = useState("")

  // States de Endereço e Geolocalização
  const [zipCode, setZipCode] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [complement, setComplement] = useState("")
  const [city, setCity] = useState("")
  const [uf, setUf] = useState("")
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  
  // Coordenadas (Hidden inputs)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")

  const [hours, setHours] = useState<any[]>([])

  // Helper para formatar moeda
  const formatCurrency = (value: string | number) => {
    if (!value && value !== 0) return ""
    const numberValue = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue)
  }

  // Efeito para fechar o modal automaticamente em caso de sucesso
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, 1500) 
      return () => clearTimeout(timer)
    }
  }, [state, onOpenChange])

  // Sincroniza dados do banco com o formulário
  useEffect(() => {
    if (store) {
      setCnpj(store.cnpj || "")
      setPhone(store.whatsapp || "")
      
      // Carrega Endereço
      setZipCode(store.zip_code || "")
      setStreet(store.street || "")
      setNumber(store.number || "")
      setNeighborhood(store.neighborhood || "")
      setComplement(store.complement || "")
      setCity(store.city || "")
      setUf(store.state || "")

      // Carrega Valores
      const settings = store.settings || {}
      setDeliveryFeeMode(settings.delivery_fee_mode || "fixed")
      if (settings.delivery_fee !== undefined) setDeliveryFee(formatCurrency(settings.delivery_fee))
      if (settings.price_per_km !== undefined) setPricePerKm(formatCurrency(settings.price_per_km))
      if (settings.minimum_order !== undefined) setMinimumOrder(formatCurrency(settings.minimum_order))
      
      // Carrega Geolocalização Salva
      if (settings.location) {
          setLatitude(settings.location.lat)
          setLongitude(settings.location.lng)
      }

      const defaultHours = [
        { day: "Segunda", open: "08:00", close: "18:00", active: true },
        { day: "Terça", open: "08:00", close: "18:00", active: true },
        { day: "Quarta", open: "08:00", close: "18:00", active: true },
        { day: "Quinta", open: "08:00", close: "18:00", active: true },
        { day: "Sexta", open: "08:00", close: "18:00", active: true },
        { day: "Sábado", open: "09:00", close: "14:00", active: true },
        { day: "Domingo", open: "00:00", close: "00:00", active: false },
      ]
      setHours(settings.business_hours || defaultHours)
    }
  }, [store, isOpen])

  // Lógica de CEP (ViaCEP) + Busca de Coordenadas (Nominatim)
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     let value = e.target.value.replace(/\D/g, "")
     if (value.length > 8) value = value.slice(0, 8)
     value = value.replace(/^(\d{5})(\d)/, "$1-$2")
     setZipCode(value)
  }

  const handleCepBlur = async () => {
    const cleanCep = zipCode.replace(/\D/g, "")
    if (cleanCep.length === 8) {
      setIsLoadingCep(true)
      try {
        // 1. Busca Endereço
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setStreet(data.logradouro)
          setNeighborhood(data.bairro)
          setCity(data.localidade)
          setUf(data.uf)
          
          // 2. Busca Coordenadas (Para cálculo de KM)
          // Tenta buscar com Logradouro + Cidade, se falhar, tenta só CEP + Cidade
          const query = `${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
          const geoData = await geoRes.json()
          
          if (geoData && geoData.length > 0) {
              setLatitude(geoData[0].lat)
              setLongitude(geoData[0].lon)
          } else {
               // Fallback só com CEP
               const cepQuery = `${cleanCep}, Brasil`
               const cepGeoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cepQuery)}&limit=1`)
               const cepGeoData = await cepGeoRes.json()
               if (cepGeoData && cepGeoData.length > 0) {
                   setLatitude(cepGeoData[0].lat)
                   setLongitude(cepGeoData[0].lon)
               }
          }

          document.getElementById("number")?.focus()
        }
      } catch (error) {
        console.error("Erro ao buscar CEP/Geo", error)
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  // Máscaras e Formatação
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value
    value = value.replace(/\D/g, "")
    const numberValue = parseInt(value) / 100
    if (isNaN(numberValue)) { setter(""); return }
    setter(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue))
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 14) value = value.slice(0, 14)
    value = value.replace(/^(\d{2})(\d)/, "$1.$2")
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    value = value.replace(/\.(\d{3})(\d)/, ".$1/$2")
    value = value.replace(/(\d{4})(\d)/, "$1-$2")
    setCnpj(value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 11) value = value.slice(0, 11)
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2")
    value = value.replace(/(\d)(\d{4})$/, "$1-$2")
    setPhone(value)
  }

  const toggleDay = (index: number) => {
    const newHours = [...hours]
    newHours[index].active = !newHours[index].active
    setHours(newHours)
  }

  const updateTime = (index: number, field: string, value: string) => {
    const newHours = [...hours]
    newHours[index][field] = value
    setHours(newHours)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Configurações & Perfil</DialogTitle>
          <DialogDescription className="text-center">
            Gerencie dados, endereço e regras de entrega.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-2">
          
          {/* Inputs Ocultos para Geolocalização */}
          <input type="hidden" name="latitude" value={latitude} />
          <input type="hidden" name="longitude" value={longitude} />

          {/* SEÇÃO 1: PERFIL */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Perfil e Segurança</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Seu Nome</Label>
              <Input id="fullName" name="fullName" defaultValue={userName} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input id="password" name="password" type="password" placeholder="********" />
               </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="********" />
               </div>
            </div>
          </div>

          {/* SEÇÃO 2: LOJA E ENDEREÇO */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <Store className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Loja e Endereço</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input id="name" name="name" defaultValue={store?.name} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" value={cnpj} onChange={handleCnpjChange} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" value={phone} onChange={handlePhoneChange} required />
              </div>
            </div>
            
            {/* ENDEREÇO */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-4 mt-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Endereço da Loja</span>
                </div>
                {/* Inputs de Endereço (Mantidos iguais) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label htmlFor="zipCode" className="text-xs">CEP</Label>
                        <div className="relative">
                            <Input id="zipCode" name="zipCode" value={zipCode} onChange={handleCepChange} onBlur={handleCepBlur} placeholder="00000-000" required />
                            {isLoadingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-primary" />}
                        </div>
                    </div>
                    <div className="col-span-2 md:col-span-2 space-y-1"><Label htmlFor="city" className="text-xs">Cidade</Label><Input id="city" name="city" value={city} onChange={e => setCity(e.target.value)} readOnly className="bg-muted"/></div>
                    <div className="col-span-2 md:col-span-1 space-y-1"><Label htmlFor="state" className="text-xs">UF</Label><Input id="state" name="state" value={uf} onChange={e => setUf(e.target.value)} readOnly className="bg-muted"/></div>
                    <div className="col-span-2 md:col-span-3 space-y-1"><Label htmlFor="street" className="text-xs">Logradouro</Label><Input id="street" name="street" value={street} onChange={e => setStreet(e.target.value)} required /></div>
                    <div className="col-span-2 md:col-span-1 space-y-1"><Label htmlFor="number" className="text-xs">Número</Label><Input id="number" name="number" value={number} onChange={e => setNumber(e.target.value)} required /></div>
                    <div className="col-span-2 space-y-1"><Label htmlFor="neighborhood" className="text-xs">Bairro</Label><Input id="neighborhood" name="neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} required /></div>
                    <div className="col-span-2 space-y-1"><Label htmlFor="complement" className="text-xs">Complemento</Label><Input id="complement" name="complement" value={complement} onChange={e => setComplement(e.target.value)} /></div>
                </div>
                
                {(!latitude || !longitude) && !isLoadingCep && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                        <Car className="w-4 h-4" />
                        <span>Preencha o CEP corretamente para ativar o cálculo de KM.</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo">Logotipo</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer text-sm" />
            </div>
          </div>

          {/* SEÇÃO 3: REGRAS DE PEDIDO E ENTREGA (NOVA LÓGICA) */}
          <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Regras de Pedido & Entrega</span>
                </div>

                {/* Seleção de Modo */}
                <div className="space-y-3">
                    <Label>Como você cobra a entrega?</Label>
                    <RadioGroup defaultValue={deliveryFeeMode} name="deliveryFeeMode" onValueChange={setDeliveryFeeMode} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center space-x-2 border p-3 rounded-lg bg-white">
                            <RadioGroupItem value="fixed" id="mode-fixed" />
                            <Label htmlFor="mode-fixed" className="cursor-pointer font-normal">Valor Fixo</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-lg bg-white">
                            <RadioGroupItem value="per_km" id="mode-km" />
                            <Label htmlFor="mode-km" className="cursor-pointer font-normal">Por Km</Label>
                        </div>
                         <div className="flex items-center space-x-2 border p-3 rounded-lg bg-white">
                            <RadioGroupItem value="fixed_plus_km" id="mode-hybrid" />
                            <Label htmlFor="mode-hybrid" className="cursor-pointer font-normal">Fixo + Km</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input Taxa Fixa */}
                    {(deliveryFeeMode === 'fixed' || deliveryFeeMode === 'fixed_plus_km') && (
                         <div className="space-y-2 animate-in fade-in zoom-in-95">
                            <Label htmlFor="deliveryFee">Taxa Fixa</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                                <Input id="deliveryFee" name="deliveryFee" value={deliveryFee} onChange={(e) => handleCurrencyInput(e, setDeliveryFee)} className="pl-9" placeholder="0,00" />
                            </div>
                        </div>
                    )}

                    {/* Input Preço por Km */}
                    {(deliveryFeeMode === 'per_km' || deliveryFeeMode === 'fixed_plus_km') && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95">
                            <Label htmlFor="pricePerKm">Preço por Km</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                                <Input id="pricePerKm" name="pricePerKm" value={pricePerKm} onChange={(e) => handleCurrencyInput(e, setPricePerKm)} className="pl-9" placeholder="0,00" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Distância calculada em linha reta.</p>
                        </div>
                    )}

                    {/* Pedido Mínimo (Sempre visível) */}
                    <div className="space-y-2">
                        <Label htmlFor="minimumOrder">Pedido Mínimo</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                            <Input id="minimumOrder" name="minimumOrder" value={minimumOrder} onChange={(e) => handleCurrencyInput(e, setMinimumOrder)} className="pl-9" placeholder="0,00" />
                        </div>
                    </div>
                </div>
            </div>

          {/* SEÇÃO 4: HORÁRIOS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Horários</h3>
            </div>
            <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />
            
            <div className="bg-muted/30 border rounded-lg p-3 space-y-2">
              {hours.map((day, index) => (
                <div key={index} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3 w-32">
                    <Switch checked={day.active} onCheckedChange={() => toggleDay(index)} className="scale-75" />
                    <span className={day.active ? "font-medium" : "text-muted-foreground"}>{day.day}</span>
                  </div>
                  {day.active ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Input type="time" value={day.open} onChange={(e) => updateTime(index, 'open', e.target.value)} className="w-20 h-7 text-xs p-1" />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input type="time" value={day.close} onChange={(e) => updateTime(index, 'close', e.target.value)} className="w-20 h-7 text-xs p-1" />
                    </div>
                  ) : <span className="text-muted-foreground text-xs flex-1 text-right pr-2">Fechado</span>}
                </div>
              ))}
            </div>
          </div>

          {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
          {state?.success && <Alert className="bg-green-50 text-green-700 border-green-200 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><AlertDescription className="font-medium">{state.success}</AlertDescription></Alert>}

          <Button type="submit" className="w-full" disabled={isPending || state?.success}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : state?.success ? "Salvo!" : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
