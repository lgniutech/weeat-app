"use client"

import { useActionState, useState } from "react"
import { createStoreAction } from "@/app/actions/store"
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
import { Loader2, Store, FileText, Phone, Check, User, MapPin } from "lucide-react"

export function StoreSetupModal() {
  const [isOpen, setIsOpen] = useState(true)
  const [state, action, isPending] = useActionState(createStoreAction, null)
  
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")
  
  // Estados de Endereço Completo
  const [zipCode, setZipCode] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [complement, setComplement] = useState("")
  const [city, setCity] = useState("")
  const [uf, setUf] = useState("")
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  const [hours, setHours] = useState([
    { day: "Segunda", open: "08:00", close: "18:00", active: true },
    { day: "Terça", open: "08:00", close: "18:00", active: true },
    { day: "Quarta", open: "08:00", close: "18:00", active: true },
    { day: "Quinta", open: "08:00", close: "18:00", active: true },
    { day: "Sexta", open: "08:00", close: "18:00", active: true },
    { day: "Sábado", open: "09:00", close: "14:00", active: true },
    { day: "Domingo", open: "00:00", close: "00:00", active: false },
  ])

  // Máscaras e Validadores
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

  // Lógica do ViaCEP
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
          // Foca no campo de número automaticamente
          document.getElementById("number")?.focus()
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error)
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  const toggleDay = (index: number) => {
    const newHours = [...hours]
    newHours[index].active = !newHours[index].active
    setHours(newHours)
  }

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    const newHours = [...hours]
    newHours[index][field] = value
    setHours(newHours)
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center font-bold">Bem-vindo ao WeEat!</DialogTitle>
          <DialogDescription className="text-center">
            Vamos configurar sua conta e sua loja.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-2">
          
          {/* SEÇÃO 1: DADOS DO RESPONSÁVEL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Seus Dados</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo <span className="text-destructive">*</span></Label>
              <Input id="fullName" name="fullName" placeholder="Como você quer ser chamado?" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Criar Senha</Label>
                <Input id="password" name="password" type="password" placeholder="Mín. 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DA LOJA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Store className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Dados da Loja</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome Fantasia <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" placeholder="Ex: Hamburgueria do Dev" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="cnpj" 
                    name="cnpj" 
                    value={cnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00" 
                    className="pl-9"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="whatsapp" 
                    name="whatsapp"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999" 
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO DE ENDEREÇO DA LOJA (COMPLETO) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg border">
                {/* CEP e UF */}
                <div className="col-span-2 md:col-span-1 space-y-2">
                    <Label htmlFor="zipCode">CEP <span className="text-destructive">*</span></Label>
                    <div className="relative">
                        <Input 
                            id="zipCode" 
                            name="zipCode" 
                            value={zipCode} 
                            onChange={handleCepChange} 
                            onBlur={handleCepBlur} 
                            placeholder="00000-000" 
                            required 
                        />
                        {isLoadingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
                    </div>
                </div>
                <div className="col-span-2 md:col-span-2 space-y-2">
                     <Label htmlFor="city">Cidade</Label>
                     <Input id="city" name="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" required readOnly className="bg-muted"/>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                     <Label htmlFor="state">UF</Label>
                     <Input id="state" name="state" value={uf} onChange={e => setUf(e.target.value)} placeholder="UF" maxLength={2} required readOnly className="bg-muted"/>
                </div>

                {/* Rua e Número */}
                <div className="col-span-2 md:col-span-3 space-y-2">
                    <Label htmlFor="street">Rua / Av <span className="text-destructive">*</span></Label>
                    <Input id="street" name="street" value={street} onChange={e => setStreet(e.target.value)} placeholder="Nome da rua" required />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                    <Label htmlFor="number">Número <span className="text-destructive">*</span></Label>
                    <Input id="number" name="number" value={number} onChange={e => setNumber(e.target.value)} placeholder="123" required />
                </div>

                {/* Bairro e Complemento */}
                <div className="col-span-2 space-y-2">
                    <Label htmlFor="neighborhood">Bairro <span className="text-destructive">*</span></Label>
                    <Input id="neighborhood" name="neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Centro" required />
                </div>
                <div className="col-span-2 space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" name="complement" value={complement} onChange={e => setComplement(e.target.value)} placeholder="Apto, Sala..." />
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
              <Check className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Funcionamento</h3>
            </div>
            
            <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />

            <div className="bg-muted/30 border rounded-lg p-3 space-y-2">
              {hours.map((day, index) => (
                <div key={day.day} className="flex items-center justify-between gap-2 text-sm">
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

          <Button type="submit" className="w-full h-12 text-md font-bold" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configurando...</>
            ) : (
              <><Check className="mr-2 h-5 w-5" /> Salvar Tudo e Acessar</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
