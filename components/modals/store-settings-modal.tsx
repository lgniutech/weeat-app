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
import { Loader2, Save, Store, Phone, FileText, Clock, User, Lock, Settings, MapPin } from "lucide-react"

interface StoreSettingsModalProps {
  store: any
  userName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function StoreSettingsModal({ store, userName, isOpen, onOpenChange }: StoreSettingsModalProps) {
  const [state, action, isPending] = useActionState(updateStoreAction, null)
  
  // States locais
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")
  const [hours, setHours] = useState<any[]>([])

  // States de Endereço
  const [cep, setCep] = useState("")
  const [city, setCity] = useState("")
  const [uf, setUf] = useState("")
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  // Sincroniza dados
  useEffect(() => {
    if (store) {
      setCnpj(store.cnpj || "")
      setPhone(store.whatsapp || "")
      
      // Carrega Cidade e Estado já salvos
      setCity(store.city || "")
      setUf(store.state || "")
      
      const defaultHours = [
        { day: "Segunda", open: "08:00", close: "18:00", active: true },
        { day: "Terça", open: "08:00", close: "18:00", active: true },
        { day: "Quarta", open: "08:00", close: "18:00", active: true },
        { day: "Quinta", open: "08:00", close: "18:00", active: true },
        { day: "Sexta", open: "08:00", close: "18:00", active: true },
        { day: "Sábado", open: "09:00", close: "14:00", active: true },
        { day: "Domingo", open: "00:00", close: "00:00", active: false },
      ]
      setHours(store.settings?.business_hours || defaultHours)
    }
  }, [store, isOpen])

  // Fecha modal após sucesso (Opcional, removido para permitir ver o feedback de sucesso)
  /* useEffect(() => {
    if(state?.success) {
      // onOpenChange(false)
    }
  }, [state]) */

  // Máscaras
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

  // Lógica de CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     let value = e.target.value.replace(/\D/g, "")
     if (value.length > 8) value = value.slice(0, 8)
     value = value.replace(/^(\d{5})(\d)/, "$1-$2")
     setCep(value)
  }

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length === 8) {
      setIsLoadingCep(true)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setCity(data.localidade)
          setUf(data.uf)
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

  const updateTime = (index: number, field: string, value: string) => {
    const newHours = [...hours]
    newHours[index][field] = value
    setHours(newHours)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Configurações & Perfil</DialogTitle>
          <DialogDescription className="text-center">
            Gerencie seus dados e informações da loja.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-2">
          
          {/* SEÇÃO 1: PESSOAL & SEGURANÇA */}
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
                   <Input id="password" name="password" type="password" placeholder="Mudar senha..." className="pl-9"/>
                </div>
               </div>
               <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" className="pl-9"/>
                </div>
               </div>
            </div>
          </div>

          {/* SEÇÃO 2: LOJA */}
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
                  <Input 
                    id="cnpj" 
                    name="cnpj" 
                    value={cnpj} 
                    onChange={handleCnpjChange}
                    className="pl-9"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="whatsapp" 
                    name="whatsapp" 
                    value={phone} 
                    onChange={handlePhoneChange}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO DE ENDEREÇO (NOVO) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-3 rounded-lg border">
                <div className="col-span-2 md:col-span-1 space-y-2">
                    <Label htmlFor="cep">Atualizar CEP</Label>
                    <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="cep" 
                            value={cep} 
                            onChange={handleCepChange} 
                            onBlur={handleCepBlur} 
                            placeholder="Buscar..." 
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="col-span-2 md:col-span-2 space-y-2">
                     <Label htmlFor="city">Cidade {isLoadingCep && <Loader2 className="inline w-3 h-3 animate-spin"/>}</Label>
                     <Input id="city" name="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" required readOnly={isLoadingCep}/>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                     <Label htmlFor="state">UF</Label>
                     <Input id="state" name="state" value={uf} onChange={e => setUf(e.target.value)} placeholder="UF" maxLength={2} required readOnly={isLoadingCep}/>
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
            <Alert className="bg-green-50 text-green-700 border-green-200">
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
