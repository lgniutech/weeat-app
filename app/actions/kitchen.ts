"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // CORREÇÃO 1: Busca 'aceito' (novos) E 'preparando' (em andamento)
  // CORREÇÃO 2: Busca 'product_name' e 'observation' corretos
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
    .in("status", ["aceito", "preparando"]) // <--- AQUI ESTAVA O ERRO (Faltava o 'aceito')
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

  // Lógica de Avanço:
  // Aceito (Novo) -> Preparando (Fogo) -> Enviado (Pronto/Sino Toca)
  if (currentStatus === 'aceito') {
    nextStatus = 'preparando';
  } else if (currentStatus === 'preparando') {
    nextStatus = 'enviado'; // 'enviado' é o status que faz o sino tocar no garçom
  } else {
    return { success: false };
  }

  const { error } = await supabase
    .from("orders")
    .update({ 
        status: nextStatus,
        last_status_change: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    return { error: "Erro ao atualizar pedido." };
  }

  revalidatePath("/");
  return { success: true };
}
