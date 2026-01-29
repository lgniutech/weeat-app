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
import { Loader2, Save, Store, Phone, FileText, Clock, User, Lock, Settings, MapPin, DollarSign, CheckCircle2 } from "lucide-react"

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
  
  // States de Valores
  const [deliveryFee, setDeliveryFee] = useState("")
  const [minimumOrder, setMinimumOrder] = useState("")

  // States de Endereço
  const [zipCode, setZipCode] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [complement, setComplement] = useState("")
  const [city, setCity] = useState("")
  const [uf, setUf] = useState("")
  const [isLoadingCep, setIsLoadingCep] = useState(false)

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
      }, 1500) // Fecha após 1.5 segundos
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

      // Carrega Valores (com verificação de segurança para settings)
      const settings = store.settings || {}
      if (settings.delivery_fee !== undefined) setDeliveryFee(formatCurrency(settings.delivery_fee))
      if (settings.minimum_order !== undefined) setMinimumOrder(formatCurrency(settings.minimum_order))
      
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

  // Lógica de CEP (ViaCEP)
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
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setStreet(data.logradouro)
          setNeighborhood(data.bairro)
          setCity(data.localidade)
          setUf(data.uf)
          // UX: Joga o foco para o número para agilizar
          document.getElementById("number")?.focus()
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error)
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  // Máscaras e Formatação
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value
    // Remove tudo que não é dígito
    value = value.replace(/\D/g, "")
    // Converte para centavos e formata
    const numberValue = parseInt(value) / 100
    if (isNaN(numberValue)) {
        setter("")
        return
    }
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
            Gerencie seus dados, endereço e taxas de entrega.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-2">
          
          {/* SEÇÃO 1: PERFIL E SEGURANÇA */}
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
                <Label htmlFor="password">Nova Senha (Opcional)</Label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input id="password" name="password" type="password" placeholder="********" className="pl-9"/>
                </div>
               </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="********" className="pl-9"/>
                </div>
               </div>
            </div>
          </div>

          {/* SEÇÃO 2: INFORMAÇÕES DA LOJA */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <Store className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Informações da Loja</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input id="name" name="name" defaultValue={store?.name} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="cnpj" name="cnpj" value={cnpj} onChange={handleCnpjChange} className="pl-9" disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="whatsapp" name="whatsapp" value={phone} onChange={handlePhoneChange} className="pl-9" required />
                </div>
              </div>
            </div>
            
            {/* BLOCO DE ENDEREÇO */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-4 mt-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Endereço & Localização</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* CEP */}
                    <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label htmlFor="zipCode" className="text-xs">CEP</Label>
                        <div className="relative">
                            <Input 
                                id="zipCode" 
                                name="zipCode"
                                value={zipCode} 
                                onChange={handleCepChange} 
                                onBlur={handleCepBlur} 
                                placeholder="00000-000" 
                                className="h-9"
                                required
                            />
                            {isLoadingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-primary" />}
                        </div>
                    </div>
                    
                    {/* Cidade e UF */}
                    <div className="col-span-2 md:col-span-2 space-y-1">
                        <Label htmlFor="city" className="text-xs">Cidade</Label>
                        <Input id="city" name="city" value={city} onChange={e => setCity(e.target.value)} readOnly className="h-9 bg-muted"/>
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label htmlFor="state" className="text-xs">UF</Label>
                        <Input id="state" name="state" value={uf} onChange={e => setUf(e.target.value)} readOnly className="h-9 bg-muted"/>
                    </div>

                    {/* Rua e Número */}
                    <div className="col-span-2 md:col-span-3 space-y-1">
                        <Label htmlFor="street" className="text-xs">Logradouro</Label>
                        <Input id="street" name="street" value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua..." className="h-9" required />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label htmlFor="number" className="text-xs">Número</Label>
                        <Input id="number" name="number" value={number} onChange={e => setNumber(e.target.value)} placeholder="Nº" className="h-9" required />
                    </div>
                    
                    {/* Bairro e Complemento */}
                    <div className="col-span-2 space-y-1">
                        <Label htmlFor="neighborhood" className="text-xs">Bairro</Label>
                        <Input id="neighborhood" name="neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Bairro" className="h-9" required />
                    </div>
                    <div className="col-span-2 space-y-1">
                         <Label htmlFor="complement" className="text-xs">Complemento</Label>
                         <Input id="complement" name="complement" value={complement} onChange={e => setComplement(e.target.value)} placeholder="Opcional" className="h-9" />
                    </div>
                </div>
            </div>

            {/* BLOCO DE TAXAS E VALORES */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Configurações de Pedido</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="deliveryFee">Taxa de Entrega (Padrão)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                            <Input 
                                id="deliveryFee" 
                                name="deliveryFee" 
                                value={deliveryFee}
                                onChange={(e) => handleCurrencyInput(e, setDeliveryFee)}
                                className="pl-9"
                                placeholder="0,00"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Valor fixo para entrega.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minimumOrder">Pedido Mínimo</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                            <Input 
                                id="minimumOrder" 
                                name="minimumOrder" 
                                value={minimumOrder}
                                onChange={(e) => handleCurrencyInput(e, setMinimumOrder)}
                                className="pl-9"
                                placeholder="0,00"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Valor mínimo para o cliente fechar o carrinho.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logotipo</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer text-sm" />
            </div>
          </div>

          {/* SEÇÃO 3: HORÁRIOS */}
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
                    <Switch 
                      checked={day.active} 
                      onCheckedChange={() => toggleDay(index)} 
                      className="scale-75"
                    />
                    <span className={day.active ? "font-medium" : "text-muted-foreground"}>
                      {day.day}
                    </span>
                  </div>
                  
                  {day.active ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Input 
                        type="time" 
                        value={day.open}
                        onChange={(e) => updateTime(index, 'open', e.target.value)}
                        className="w-20 h-7 text-xs bg-background p-1"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input 
                        type="time" 
                        value={day.close}
                        onChange={(e) => updateTime(index, 'close', e.target.value)}
                        className="w-20 h-7 text-xs bg-background p-1"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs flex-1 text-right pr-2">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert className="bg-green-50 text-green-700 border-green-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="font-medium">{state.success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending || state?.success}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : state?.success ? (
              "Salvo!"
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
