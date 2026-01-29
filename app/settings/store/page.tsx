import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { StoreSettingsModal } from "@/components/modals/store-settings-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Clock, DollarSign, Store } from "lucide-react"

export default async function StoreSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!store) redirect("/")

  const safeStore = { ...store, settings: store.settings || {} }

  // Formata endereço para visualização
  const address = store.street 
    ? `${store.street}, ${store.number} - ${store.neighborhood}` 
    : "Endereço não configurado"

  return (
    <div className="space-y-8 pb-10 max-w-5xl">
      
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Configurações da Loja</h3>
        <p className="text-muted-foreground">
          Personalize a aparência do seu cardápio e gerencie dados operacionais.
        </p>
      </div>

      <div className="grid gap-8">
          
          {/* CARTÃO DE DADOS & LOGÍSTICA (O Resumo com o botão do Modal) */}
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Store className="w-5 h-5" /> Dados & Operação
                    </CardTitle>
                    <CardDescription>Informações principais, endereço e regras de entrega.</CardDescription>
                </div>
                {/* O BOTÃO MÁGICO QUE ABRE O POP-UP */}
                <StoreSettingsModal 
                    store={safeStore} 
                    triggerButton={<Button>Editar Informações</Button>} 
                />
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                    {/* Resumo Esquerda */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-16 w-16 rounded-md bg-slate-100 overflow-hidden border">
                                {store.logo_url ? <img src={store.logo_url} className="h-full w-full object-cover" /> : <Store className="h-8 w-8 m-auto text-slate-300" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{store.name}</h4>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="w-3 h-3" /> {store.whatsapp || "Sem telefone"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> 
                            {address}
                        </div>
                    </div>

                    {/* Resumo Direita (Logística) */}
                    <div className="space-y-3 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Taxa de Entrega</span>
                            <Badge variant="secondary" className="font-bold">
                                {Number(store.delivery_fee) > 0 ? `R$ ${store.delivery_fee}` : "Grátis"}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Tempo Estimado</span>
                            <span className="font-medium">
                                {store.estimated_time_min || 30}-{store.estimated_time_max || 50} min
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                             <span className="text-muted-foreground">Pedido Mínimo</span>
                             <span className="font-medium">R$ {store.min_order_value || 0}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* FORMULÁRIO DE APARÊNCIA (Mantido separado pois é visual) */}
          <AppearanceForm />
      </div>
    </div>
  )
}
