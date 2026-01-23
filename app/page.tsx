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
    .maybeSingle() 

  // Se não tem loja, passamos hasStore=false para o cliente abrir o Modal
  // Não fazemos mais redirect("/setup")

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      hasStore={!!store} 
      storeName={store?.name}
      storeLogo={store?.logo_url}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
