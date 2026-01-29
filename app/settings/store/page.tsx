import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreSettingsForm } from "./store-settings-form"
import { AppearanceForm } from "@/components/settings/appearance-form" 
import { DeliverySettings } from "@/components/modules/delivery-settings" // <--- Importamos o componente novo aqui

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
          Gerencie os dados do seu estabelecimento, logística e aparência.
        </p>
      </div>

      <div className="grid gap-8">
          {/* 1. Formulário de Dados Básicos */}
          <StoreSettingsForm store={safeStore} />

          {/* 2. Configurações de Entrega (AQUI ESTÁ O QUE FALTAVA) */}
          <DeliverySettings store={safeStore} />

          {/* 3. Formulário de Aparência */}
          <AppearanceForm />
      </div>

    </div>
  )
}
