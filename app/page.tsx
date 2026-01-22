import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Verifica usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Verifica se a loja existe
  // MUDANÇA: Usamos .maybeSingle() em vez de .single()
  // Isso evita o erro 406 quando o usuário ainda não tem loja
  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle() 

  // Pega o nome do usuário dos metadados ou usa o e-mail como fallback
  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      hasStore={!!store} // Se store for null, hasStore será false -> Abre o Modal
      storeName={store?.name}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
