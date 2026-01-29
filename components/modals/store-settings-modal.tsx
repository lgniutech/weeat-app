"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updateStoreAction, updateStoreDeliverySettingsAction } from "@/app/actions/store"
import { Loader2, Upload, MapPin, Store, DollarSign, Clock, Bike, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function StoreSettingsModal({ store, triggerButton }: { store: any, triggerButton?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estados de Dados Básicos
  const [name, setName] = useState(store.name || "")
  const [whatsapp, setWhatsapp] = useState(store.whatsapp || "")
  const [bio, setBio] = useState(store.bio || "")
  const [logoUrl, setLogoUrl] = useState(store.logo_url || "")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  // Estados de Endereço
  const [zipCode, setZipCode] = useState(store.zip_code || "")
  const [street, setStreet] = useState(store.street || "")
  const [number, setNumber] = useState(store.number || "")
  const [neighborhood, setNeighborhood] = useState(store.neighborhood || "")
  const [city, setCity] = useState(store.city || "")
  const [state, setState] = useState(store.state || "")
  const [complement, setComplement] = useState(store.complement || "")
  const [loadingCep, setLoadingCep] = useState(false)

  // Estados de Logística (Frete/Tempo)
  const [deliveryFee, setDeliveryFee] = useState(store.delivery_fee || 0)
  const [minOrder, setMinOrder] = useState(store.min_order_value || 0)
  const [timeMin, setTimeMin] = useState(store.estimated_time_min || 30)
  const [timeMax, setTimeMax] = useState(store.estimated_time_max || 50)

  // Busca CEP automático
  const handleCepBlur = async () => {
    const cleanCep = zipCode.replace(/\D/g, "")
    if (cleanCep.length === 8) {
      setLoadingCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setStreet(data.logradouro)
          setNeighborhood(data.bairro)
          setCity(data.localidade)
          setState(data.uf)
          document.getElementById("num-input")?.focus()
        }
      } catch (error) {
        console.error("Erro CEP", error)
      } finally {
        setLoadingCep(false)
      }
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      setLogoUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      // 1. Prepara FormData para dados básicos
      const formData = new FormData()
      formData.append("name", name)
      formData.append("whatsapp", whatsapp)
      formData.append("bio", bio) // Bio agora é salva via server action
      formData.append("zipCode", zipCode)
      formData.append("street", street)
      formData.append("number", number)
      formData.append("neighborhood", neighborhood)
      formData.append("city", city)
      formData.append("state", state)
      formData.append("complement", complement)
      // Mantém horas como string vazia ou atual se não editado aqui (simplificação)
      formData.append("businessHours", JSON.stringify(store.settings?.business_hours || [])) 
      
      if (logoFile) {
        formData.append("logo", logoFile)
      }

      // 2. Dispara updates em paralelo
      const [basicRes, deliveryRes] = await Promise.all([
         updateStoreAction(null, formData),
         updateStoreDeliverySettingsAction(store.id, {
             deliveryFee: Number(deliveryFee),
             minOrderValue: Number(minOrder),
             timeMin: Number(timeMin),
             timeMax: Number(timeMax)
         })
      ])

      if (basicRes?.error) throw new Error(basicRes.error)
      if (deliveryRes?.error) throw new Error(deliveryRes.error)

      setOpen(false)
      // Recarrega a página forçado para garantir atualização visual das imagens
      window.location.reload()

    } catch (error: any) {
      alert("Erro ao salvar: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || <Button variant="outline">Editar Dados da Loja</Button>}
      </DialogTrigger>
      
      {/* MODAL GRANDE E QUADRADO (max-w-4xl) */}
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 border-b bg-slate-50 sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="w-5 h-5 text-primary" /> Editar Loja & Operação
          </DialogTitle>
          <DialogDescription>
            Configure seus dados básicos e regras de logística em um só lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUNA ESQUERDA: DADOS BÁSICOS & ENDEREÇO */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2 mb-4">
                    <MapPin className="w-4 h-4" /> Informações Básicas
                </div>

                <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center overflow-hidden relative cursor-pointer hover:bg-muted transition-colors">
                            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoChange} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label>Nome da Loja</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Burguer King" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>WhatsApp (Somente números)</Label>
                        <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11999999999" />
                    </div>

                    <div className="space-y-1">
                        <Label>Bio / Descrição Curta</Label>
                        <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="O melhor hambúrguer da cidade..." className="resize-none h-20" />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Endereço</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1 relative">
                            <Input placeholder="CEP" value={zipCode} onChange={e => setZipCode(e.target.value)} onBlur={handleCepBlur} />
                            {loadingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                        </div>
                        <div className="col-span-2"><Input placeholder="Rua" value={street} onChange={e => setStreet(e.target.value)} readOnly /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                         <div className="col-span-1"><Input id="num-input" placeholder="Nº" value={number} onChange={e => setNumber(e.target.value)} /></div>
                         <div className="col-span-3"><Input placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} readOnly /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <Input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} readOnly />
                         <Input placeholder="Estado" value={state} onChange={e => setState(e.target.value)} readOnly />
                    </div>
                    <Input placeholder="Complemento" value={complement} onChange={e => setComplement(e.target.value)} />
                </div>
            </div>

            {/* COLUNA DIREITA: LOGÍSTICA & REGRAS */}
            <div className="space-y-6 md:border-l md:pl-8 border-slate-100">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2 mb-4">
                    <Bike className="w-4 h-4" /> Logística & Entregas
                </div>

                <div className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Taxa de Entrega (Fixa)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                                <Input type="number" className="pl-9 bg-white" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
                            </div>
                            <p className="text-xs text-muted-foreground">Deixe 0 para frete grátis.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Pedido Mínimo</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                                <Input type="number" className="pl-9 bg-white" value={minOrder} onChange={e => setMinOrder(e.target.value)} />
                            </div>
                            <p className="text-xs text-muted-foreground">O cliente só consegue finalizar se atingir esse valor.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Tempo de Entrega (Minutos)</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input type="number" className="text-center font-bold" value={timeMin} onChange={e => setTimeMin(e.target.value)} />
                                <span className="text-[10px] text-center block text-muted-foreground">Mínimo</span>
                            </div>
                            <span className="font-bold text-muted-foreground">-</span>
                            <div className="relative flex-1">
                                <Input type="number" className="text-center font-bold" value={timeMax} onChange={e => setTimeMax(e.target.value)} />
                                <span className="text-[10px] text-center block text-muted-foreground">Máximo</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                        <strong>Dica:</strong> Mantenha seus horários de funcionamento sempre atualizados para evitar cancelamentos.
                    </div>
                </div>
            </div>

        </div>

        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="px-8 font-bold">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Salvar Alterações"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
