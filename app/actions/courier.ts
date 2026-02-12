"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Busca pedidos que estão prontos para serem retirados (Status: 'enviado' pela cozinha).
 * Filtra apenas por delivery_type: 'entrega'.
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
    .eq("status", "enviado") // Status definido pela cozinha quando finaliza
    .order("last_status_change", { ascending: true }); // Mais antigos primeiro

  if (error) {
    console.error("Erro ao buscar entregas disponíveis:", error);
    return [];
  }

  return data || [];
}

/**
 * Busca pedidos que já saíram para entrega (Status: 'em_rota').
 * Mostra todos os pedidos em rota da loja (lista compartilhada).
 */
export async function getActiveDeliveriesAction(storeId: string) {
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
    .order("last_status_change", { ascending: false }); // Mais recentes primeiro

  if (error) {
    console.error("Erro ao buscar entregas em andamento:", error);
    return [];
  }

  return data || [];
}

/**
 * Atualiza o status da entrega (Retirar ou Finalizar).
 */
export async function updateDeliveryStatusAction(orderId: string, newStatus: 'em_rota' | 'entregue') {
  const supabase = await createClient();

  // 1. Busca status atual para histórico
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
