"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos com status 'aceito' (Fila) e 'preparando' (Fogo)
  // Adicionado 'last_status_change' para o cálculo preciso do timer
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      created_at,
      status,
      delivery_type,
      table_number,
      last_status_change, 
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

  // 1. Lógica Rígida de Transição
  if (currentStatus === 'aceito') {
    nextStatus = 'preparando'; // Cozinheiro puxou o ticket
  } else if (currentStatus === 'preparando') {
    nextStatus = 'enviado';    // Cozinheiro finalizou (Sino toca/Garçom busca)
  } else {
    // Bloqueia qualquer outra tentativa bizarra de status
    return { success: false, message: "Ação não permitida para o status atual." };
  }

  const now = new Date().toISOString();

  // 2. Atualiza Status e Reinicia o Timer (last_status_change)
  const { error } = await supabase
    .from("orders")
    .update({ 
        status: nextStatus,
        last_status_change: now
    })
    .eq("id", orderId);

  if (error) {
    return { success: false, message: "Erro ao atualizar pedido." };
  }

  // 3. Registra no Histórico (Para métricas e auditoria futura)
  // Isso habilita dashboards como "Tempo Médio de Preparo" na Fase 3
  await supabase.from("order_history").insert({
    order_id: orderId,
    previous_status: currentStatus,
    new_status: nextStatus,
    changed_at: now
  });

  revalidatePath("/");
  return { success: true };
}
