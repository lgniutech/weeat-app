import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreSettingsForm } from "./store-settings-form"

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

  // Se não tiver loja, volta para o dashboard (que abrirá o setup)
  if (!store) {
    redirect("/")
  }

  // Garante que settings seja um objeto válido para não quebrar o front
  const safeStore = {
    ...store,
    settings: store.settings || {} 
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Dados da Loja</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações principais do seu estabelecimento.
        </p>
      </div>
      <StoreSettingsForm store={safeStore} />
    </div>
  )
}
