import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreSettingsForm } from "./store-settings-form"
import { AppearanceForm } from "@/components/settings/appearance-form" // Importe o novo componente

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

  if (!store) {
    redirect("/")
  }

  const safeStore = {
    ...store,
    settings: store.settings || {} 
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Cabeçalho da Página */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Configurações</h3>
        <p className="text-muted-foreground">
          Gerencie os dados do seu estabelecimento.
        </p>
      </div>

      <div className="grid gap-8">
          {/* Formulário de Dados da Loja (Existente) */}
          <StoreSettingsForm store={safeStore} />

          {/* NOVO: Formulário de Aparência Expandido */}
          <AppearanceForm />
      </div>

    </div>
  )
}
