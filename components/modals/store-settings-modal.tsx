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
import { Loader2, Save, Store, Phone, FileText } from "lucide-react"

interface StoreSettingsModalProps {
  store: any
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_HOURS = [
  { day: "Segunda", open: "08:00", close: "18:00", active: true },
  { day: "Terça", open: "08:00", close: "18:00", active: true },
  { day: "Quarta", open: "08:00", close: "18:00", active: true },
  { day: "Quinta", open: "08:00", close: "18:00", active: true },
  { day: "Sexta", open: "08:00", close: "18:00", active: true },
  { day: "Sábado", open: "09:00", close: "14:00", active: true },
  { day: "Domingo", open: "00:00", close: "00:00", active: false },
]

export function StoreSettingsModal({ store, isOpen, onOpenChange }: StoreSettingsModalProps) {
  const [state, action, isPending] = useActionState(updateStoreAction, null)
  
  // Inicialização segura dos estados (Lazy initialization)
  // Isso garante que os dados já existam na primeira renderização
  const [cnpj, setCnpj] = useState(() => store?.cnpj || "")
  const [phone, setPhone] = useState(() => store?.whatsapp || "")
  const [hours, setHours] = useState<any[]>(() => store?.settings?.business_hours || DEFAULT_HOURS)

  // Reseta os dados apenas se o modal abrir novamente ou a store mudar
  useEffect(() => {
    if (isOpen && store) {
      setCnpj(store.cnpj || "")
      setPhone(store.whatsapp || "")
      setHours(store.settings?.business_hours || DEFAULT_HOURS)
    }
  }, [isOpen, store])

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
    if (newHours[index]) {
      newHours[index].active = !newHours[index].active
      setHours(newHours)
    }
  }

  const updateTime = (index: number, field: string, value: string) => {
    const newHours = [...hours]
    if (newHours[index]) {
      newHours[index][field] = value
      setHours(newHours)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-describedby="store-settings-description"
      >
        <DialogHeader>
          <DialogTitle>Dados da Loja</DialogTitle>
          <DialogDescription id="store-settings-description">
            Atualize as informações do seu estabelecimento.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-6 mt-4">
          
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b">
              <Store className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Informações Básicas</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input id="name" name="name" defaultValue={store?.name || ""} required />
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

             <div className="space-y-2">
              <Label htmlFor="logo">Logotipo</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer text-sm" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Horários</h3>
            <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />
            
            <div className="bg-muted/30 border rounded-lg p-3 space-y-2">
              {hours.map((day, index) => (
                <div key={day.day || index} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3 w-32">
                    <Switch 
                      checked={!!day.active} // O !! garante que seja booleano
                      onCheckedChange={() => toggleDay(index)} 
                      className="scale-75"
                    />
                    <span className={!!day.active ? "font-medium" : "text-muted-foreground"}>
                      {day.day}
                    </span>
                  </div>
                  
                  {day.active ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Input 
                        type="time" 
                        value={day.open ?? ""} // Garante que não seja undefined
                        onChange={(e) => updateTime(index, 'open', e.target.value)}
                        className="w-20 h-7 text-xs bg-background p-1"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input 
                        type="time" 
                        value={day.close ?? ""} // Garante que não seja undefined
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
