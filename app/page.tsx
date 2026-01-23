import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Verifica se a loja existe
  const { data: store } = await supabase
    .from("stores")
    .select("name, logo_url")
    .eq("owner_id", user.id) 
    .maybeSingle() // maybeSingle evita erro se não encontrar

  // Se não tem loja, vai para o setup completo
  if (!store) {
    redirect("/setup")
  }

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      hasStore={true} 
      storeName={store.name}
      storeLogo={store.logo_url}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
