"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Busca pedidos que estão prontos para serem retirados (Status: 'enviado' pela cozinha).
 * Filtra apenas por delivery_type: 'entrega'.
 * (Esta lista continua pública para todos os entregadores verem o que tem disponível)
 */
export async function getAvailableDeliveriesAction(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      customer_phone,
      address,
      payment_method,
      total_price,
      change_for,
      created_at,
      status,
      last_status_change,
      items:order_items(quantity, product_name)
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "entrega")
    .eq("status", "enviado") // Status definido pela cozinha
    .order("last_status_change", { ascending: true });

  if (error) {
    console.error("Erro ao buscar entregas disponíveis:", error);
    return [];
  }

  return data || [];
}

/**
 * Busca pedidos que já saíram para entrega (Status: 'em_rota').
 * AGORA FILTRA PELO COURIER_ID para ser uma lista privada.
 */
export async function getActiveDeliveriesAction(storeId: string, courierId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      customer_phone,
      address,
      payment_method,
      total_price,
      change_for,
      created_at,
      status,
      last_status_change,
      items:order_items(quantity, product_name)
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "entrega")
    .eq("status", "em_rota")
    .eq("courier_id", courierId) // <--- Filtro de privacidade
    .order("last_status_change", { ascending: false });

  if (error) {
    console.error("Erro ao buscar entregas em andamento:", error);
    return [];
  }

  return data || [];
}

/**
 * Ação em LOTE: Assume vários pedidos de uma vez e atribui ao entregador.
 */
export async function startBatchDeliveriesAction(orderIds: string[], courierId: string) {
  const supabase = await createClient();

  // Atualiza status e vincula o entregador
  const { error } = await supabase
    .from("orders")
    .update({ 
      status: 'em_rota',
      courier_id: courierId, // Vincula ao entregador
      last_status_change: new Date().toISOString()
    })
    .in('id', orderIds); // Atualiza todos os IDs da lista

  if (error) {
    console.error("Erro ao iniciar rota em lote:", error);
    return { success: false, message: "Erro ao iniciar entregas." };
  }

  // Cria histórico para cada pedido (Opcional: pode ser feito em loop ou ignorado se performance for crítica)
  // Para simplificar e performar, vamos assumir que o update é suficiente, 
  // mas idealmente faríamos um insert múltiplo no order_history.
  const historyEntries = orderIds.map(id => ({
    order_id: id,
    previous_status: 'enviado',
    new_status: 'em_rota',
    changed_at: new Date().toISOString()
  }));

  await supabase.from("order_history").insert(historyEntries);

  revalidatePath("/");
  return { success: true };
}

/**
 * Atualiza o status da entrega individual (Apenas finalizar).
 */
export async function updateDeliveryStatusAction(orderId: string, newStatus: 'entregue') {
  const supabase = await createClient();

  // 1. Busca status atual
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!currentOrder) return { success: false, message: "Pedido não encontrado." };

  // 2. Atualiza o pedido
  const { error: updateError } = await supabase
    .from("orders")
    .update({ 
      status: newStatus,
      last_status_change: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Erro ao atualizar status:", updateError);
    return { success: false, message: "Falha ao atualizar status." };
  }

  // 3. Registra no histórico
  await supabase.from("order_history").insert({
    order_id: orderId,
    previous_status: currentOrder.status,
    new_status: newStatus,
    changed_at: new Date().toISOString()
  });

  revalidatePath("/");
  return { success: true };
}
