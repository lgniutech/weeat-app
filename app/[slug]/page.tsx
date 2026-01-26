import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { StoreFront } from "@/components/store/store-front"
import { Metadata } from "next"

type Props = {
  params: Promise<{ slug: string }>
}

// 1. Gera o título da página dinamicamente para o Google/Navegador (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: store } = await supabase
    .from("stores")
    .select("name, bio")
    .eq("slug", slug)
    .maybeSingle()
  
  if (!store) {
    return { 
      title: "Loja não encontrada | WeEat",
      description: "A loja que você procura não foi encontrada."
    }
  }
  
  return {
    title: `${store.name} | Cardápio Digital`,
    description: store.bio || `Peça online em ${store.name}`,
  }
}

// 2. A página principal que carrega os dados
export default async function StorePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Busca a loja pelo Slug (o texto na URL)
  const { data: store } = await supabase
    .from("stores")
    .select("*") 
    .eq("slug", slug) 
    .maybeSingle()

  // Se não achar a loja, mostra página 404
  if (!store) {
    return notFound()
  }

  // Busca Categorias e Produtos dessa loja
  const { data: categoriesData } = await supabase
      .from("categories")
      .select(`
        *,
        products (
          *
        )
      `)
      .eq("store_id", store.id)
      .order("index", { ascending: true }) // Tenta ordenar por índice
  
  // Processa os dados:
  // - Filtra produtos indisponíveis (is_available = false)
  // - Ordena produtos por data de criação
  // - Remove categorias que ficaram vazias
  let categories: any[] = []
  if (categoriesData) {
    categories = categoriesData.map(cat => ({
      ...cat,
      products: cat.products
        ?.filter((p: any) => p.is_available)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })).filter(cat => cat.products.length > 0)
  }

  // Entrega tudo para o componente visual (Front-end)
  return (
    <StoreFront store={store} categories={categories} />
  )
}
