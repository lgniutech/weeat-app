"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos com status 'aceito' (Fila) e 'preparando' (Fogo)
  // Ordenados por data de criação (FIFO - First In, First Out)
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      created_at,
      status,
      delivery_type,
      table_number,
      order_items (
        id,
        quantity,
        name: product_name, 
        observation,
        removed_ingredients,
        selected_addons
      )
    `)
    .eq("store_id", storeId)
    .in("status", ["aceito", "preparando"]) 
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos da cozinha:", error);
    return [];
  }

  return data || [];
}

export async function advanceKitchenStatusAction(orderId: string, currentStatus: string) {
  const supabase = await createClient();
  
  let nextStatus = "";

  // Lógica de Avanço Rígida:
  // 1. Aceito -> Preparando (Cozinheiro assume o pedido)
  // 2. Preparando -> Enviado (Cozinheiro finaliza e notifica garçom/balcão)
  if (currentStatus === 'aceito') {
    nextStatus = 'preparando';
  } else if (currentStatus === 'preparando') {
    nextStatus = 'enviado'; 
  } else {
    return { success: false, message: "Status inválido para avanço." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ 
        status: nextStatus,
        last_status_change: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    console.error("Erro ao avançar status:", error);
    return { success: false, message: "Erro ao atualizar pedido." };
  }

  // Revalida todas as rotas para garantir que o Garçom e o Painel vejam a mudança imediatamente
  revalidatePath("/");
  return { success: true };
}
