import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Busca a loja COMPLETA agora
  const { data: store } = await supabase
    .from("stores")
    .select("*") 
    .eq("owner_id", user.id) 
    .maybeSingle()

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      store={store} // Passamos o objeto store inteiro (pode ser null)
      userName={userName}
      userEmail={userEmail}
    />
  )
}
