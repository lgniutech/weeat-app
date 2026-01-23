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
import { Loader2, Store, FileText, Phone, Check } from "lucide-react"

export function StoreSetupModal() {
  const [isOpen, setIsOpen] = useState(true)
  const [state, action, isPending] = useActionState(createStoreAction, null)
  
  // Estados para máscaras
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")

  const [hours, setHours] = useState([
    { day: "Segunda", open: "08:00", close: "18:00", active: true },
    { day: "Terça", open: "08:00", close: "18:00", active: true },
    { day: "Quarta", open: "08:00", close: "18:00", active: true },
    { day: "Quinta", open: "08:00", close: "18:00", active: true },
    { day: "Sexta", open: "08:00", close: "18:00", active: true },
    { day: "Sábado", open: "09:00", close: "14:00", active: true },
    { day: "Domingo", open: "00:00", close: "00:00", active: false },
  ])

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
            Para começar, precisamos configurar os dados oficiais da sua loja.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-4">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Básicos</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja <span className="text-destructive">*</span></Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="logo">Logotipo</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Horário de Funcionamento</h3>
            <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />

            <div className="bg-muted/40 border rounded-lg p-4 space-y-3">
              {hours.map((day, index) => (
                <div key={day.day} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3 w-32">
                    <Switch 
                      checked={day.active} 
                      onCheckedChange={() => toggleDay(index)} 
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
                        className="w-24 h-8 text-xs bg-background"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input 
                        type="time" 
                        value={day.close}
                        onChange={(e) => updateTime(index, 'close', e.target.value)}
                        className="w-24 h-8 text-xs bg-background"
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

          <Button type="submit" className="w-full h-11" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configurando Loja...</>
            ) : (
              <><Check className="mr-2 h-4 w-4" /> Salvar e Acessar Painel</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
