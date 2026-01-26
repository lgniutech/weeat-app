import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreSettingsForm } from "./store-settings-form"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { Separator } from "@/components/ui/separator"

export default async function StoreSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Busca a loja de forma segura
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle()

  // Se não tiver loja, volta para o dashboard
  if (!store) {
    redirect("/")
  }

  const safeStore = {
    ...store,
    settings: store.settings || {} 
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Cabeçalho Geral */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Configurações</h3>
        <p className="text-muted-foreground">
          Gerencie os dados do seu estabelecimento e suas preferências de uso.
        </p>
      </div>

      <Separator />

      {/* Seção 1: Dados da Loja */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Dados da Loja</h4>
        <StoreSettingsForm store={safeStore} />
      </div>

      <Separator />

      {/* Seção 2: Aparência do Painel (O Novo Componente) */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Personalização do Sistema</h4>
        <AppearanceForm />
      </div>
    </div>
  )
}
