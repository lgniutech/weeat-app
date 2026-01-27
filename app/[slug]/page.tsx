import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { StoreFront } from "@/components/store/store-front"
import { Metadata } from "next"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: store } = await supabase.from("stores").select("name, bio").eq("slug", slug).maybeSingle()
  
  if (!store) return { title: "Loja não encontrada | WeEat", description: "A loja que você procura não foi encontrada." }
  
  return { title: `${store.name} | Cardápio Digital`, description: store.bio || `Peça online em ${store.name}` }
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle()

  if (!store) return notFound()

  // Busca turbinada com Ingredientes E Adicionais
  const { data: categoriesData } = await supabase
      .from("categories")
      .select(`
        *,
        products (
          *,
          product_ingredients ( ingredient:ingredients (*) ),
          product_addons ( addon:addons (*) )
        )
      `)
      .eq("store_id", store.id)
      .order("index", { ascending: true })
  
  let categories: any[] = []
  if (categoriesData) {
    categories = categoriesData.map(cat => ({
      ...cat,
      products: cat.products
        ?.filter((p: any) => p.is_available)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((p: any) => ({
            ...p,
            ingredients: p.product_ingredients?.map((pi: any) => pi.ingredient) || [],
            addons: p.product_addons?.map((pa: any) => pa.addon) || []
        }))
    })).filter(cat => cat.products.length > 0)
  }

  return (<StoreFront store={store} categories={categories} />)
}
