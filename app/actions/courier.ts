"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Busca pedidos disponíveis para visualização do entregador.
 * Traz status: 
 * - 'enviado': Pronto para retirada (pode aceitar).
 * - 'preparando': Ainda na cozinha (apenas visualização).
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
      delivery_type,
      last_status_change,
      items:order_items(quantity, product_name)
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "entrega")
    // Trazemos tanto o que está pronto quanto o que está sendo feito
    .in("status", ["enviado", "preparando"]) 
    .order("last_status_change", { ascending: true });

  if (error) {
    console.error("Erro ao buscar entregas disponíveis:", error);
    return [];
  }

  return data || [];
}

/**
 * Busca pedidos que já saíram para entrega (Status: 'em_rota').
 * Filtra PELO COURIER_ID para ser uma lista privada.
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

  // Verifica se os pedidos ainda estão com status 'enviado' antes de pegar
  // Isso evita que dois entregadores peguem o mesmo pedido simultaneamente
  const { data: validOrders } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("status", "enviado");

  if (!validOrders || validOrders.length === 0) {
    return { success: false, message: "Nenhum dos pedidos selecionados está disponível." };
  }

  const validIds = validOrders.map(o => o.id);

  // Atualiza status e vincula o entregador
  const { error } = await supabase
    .from("orders")
    .update({ 
      status: 'em_rota',
      courier_id: courierId, 
      last_status_change: new Date().toISOString()
    })
    .in('id', validIds); 

  if (error) {
    console.error("Erro ao iniciar rota em lote:", error);
    return { success: false, message: "Erro ao iniciar entregas." };
  }

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
