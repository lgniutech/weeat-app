import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreSettingsForm } from "./store-settings-form"
import { AppearanceForm } from "@/components/settings/appearance-form" // Importação nova

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

  // Garante que settings seja um objeto válido
  const safeStore = {
    ...store,
    settings: store.settings || {} 
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl">
      
      {/* Cabeçalho da Página */}
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Configurações</h3>
        <p className="text-muted-foreground">
          Gerencie os dados do seu estabelecimento e suas preferências.
        </p>
      </div>

      <div className="grid gap-8">
          {/* 1. Formulário de Dados da Loja (Nome, Logo, etc) */}
          <StoreSettingsForm store={safeStore} />

          {/* 2. Formulário de Aparência (O NOVO BLOCO EXPANDIDO) */}
          <AppearanceForm />
      </div>

    </div>
  )
}
