"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Busca pedidos ativos para o KDS (Kitchen Display System)
export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient()

  // Buscamos pedidos com status:
  // 'aceito' -> Acabou de chegar do garçom/delivery
  // 'preparando' -> Já está na chapa/panela
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      status,
      table_number,
      customer_name,
      delivery_type,
      last_status_change,
      order_items (
        id,
        product_name,
        quantity,
        observation,
        removed_ingredients,
        selected_addons
      )
    `)
    .eq("store_id", storeId)
    .in("status", ["aceito", "preparando"]) 
    .order("created_at", { ascending: true }) // FIFO: O primeiro que entra é o primeiro que sai

  if (error) {
    console.error("Erro cozinha:", error)
    return []
  }

  return orders
}

// Avança o status do pedido
export async function advanceKitchenStatusAction(orderId: string, currentStatus: string) {
  const supabase = await createClient()
  
  let nextStatus = ""

  // Lógica de Avanço:
  // Aceito (Novo) -> Preparando (Em Produção) -> Enviado (Pronto/Sino Toca)
  if (currentStatus === 'aceito') {
    nextStatus = 'preparando'
  } else if (currentStatus === 'preparando') {
    nextStatus = 'enviado' 
  } else {
    return { success: false }
  }

  const { error } = await supabase
    .from("orders")
    .update({ 
        status: nextStatus,
        last_status_change: new Date().toISOString()
    })
    .eq("id", orderId)

  if (error) return { error: error.message }

  revalidatePath("/")
  return { success: true }
}
