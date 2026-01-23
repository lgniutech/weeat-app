import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Verifica usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // 2. Verifica se a loja existe (usando owner_id corretamente)
  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("owner_id", user.id) 
    .maybeSingle() 

  // NOTA: Removemos o redirect("/setup"). 
  // Agora passamos a informação para o cliente abrir o modal.

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      hasStore={!!store} // Se false, o DashboardClient abrirá o StoreSetupModal
      storeName={store?.name}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
