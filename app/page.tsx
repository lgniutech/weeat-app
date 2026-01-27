import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // 1. Busca a loja
  const { data: store } = await supabase
    .from("stores")
    .select("*") 
    .eq("owner_id", user.id) 
    .maybeSingle()

  // 2. Busca o Cardápio Completo (Categorias + Produtos + Ingredientes + Adicionais)
  let categories: any[] = []
  
  if (store) {
    const { data } = await supabase
      .from("categories")
      .select(`
        *,
        products (
          *,
          product_ingredients (
             ingredient:ingredients(*)
          ),
          product_addons (
             price,
             addon:addons(*)
          )
        )
      `)
      .eq("store_id", store.id)
      .order("created_at", { ascending: true }) // Ordena categorias por criação
      
    if (data) {
      categories = data.map(cat => ({
        ...cat,
        products: cat.products
          ?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((product: any) => ({
             ...product,
             // Formata Ingredientes: Remove a camada extra da tabela de ligação
             ingredients: product.product_ingredients?.map((pi: any) => pi.ingredient) || [],
             
             // Formata Adicionais: Junta os dados do addon com o preço que está na relação
             addons: product.product_addons?.map((pa: any) => ({
                 ...pa.addon,
                 price: pa.price 
             })) || []
          }))
      }))
    }
  }

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário"
  const userEmail = user.email || ""

  return (
    <DashboardClient 
      store={store} 
      categories={categories} 
      userName={userName}
      userEmail={userEmail}
    />
  )
}
