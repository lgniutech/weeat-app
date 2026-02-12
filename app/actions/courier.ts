"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 1. Busca pedidos disponíveis para visualização do entregador (A Retirar).
 * Filtra por status 'enviado' (pronto p/ entrega) ou 'preparando' (para visualização).
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
    .in("status", ["enviado", "preparando"]) 
    .order("last_status_change", { ascending: true });

  if (error) {
    console.error("Erro ao buscar entregas disponíveis:", error);
    return [];
  }

  return data || [];
}

/**
 * 2. Busca pedidos que estão ATIVAMENTE com este entregador (Minha Rota).
 * IMPORTANTE: Filtra apenas 'em_rota'. 
 * Assim que o status muda para 'entregue', o pedido some da lista automaticamente.
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
    .eq("status", "em_rota") // Só mostra o que está pendente de entrega
    .eq("courier_id", courierId) 
    .order("last_status_change", { ascending: false });

  if (error) {
    console.error("Erro ao buscar entregas em andamento:", error);
    return [];
  }

  return data || [];
}

/**
 * 3. Inicia a rota com vários pedidos de uma vez.
 * Move de 'enviado' -> 'em_rota' e vincula ao entregador.
 */
interface StartBatchParams {
  orderIds: string[];
  courierId: string;
}

export async function startBatchDeliveriesAction(params: StartBatchParams) {
  const { orderIds, courierId } = params;
  const supabase = await createClient();

  if (!courierId || typeof courierId !== 'string') {
    return { success: false, message: "ID do entregador inválido." };
  }

  if (!orderIds || orderIds.length === 0) {
    return { success: false, message: "Nenhum pedido selecionado." };
  }

  // Verifica se os pedidos ainda estão disponíveis (status 'enviado')
  const { data: validOrders } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("status", "enviado");

  if (!validOrders || validOrders.length === 0) {
    return { success: false, message: "Pedidos indisponíveis ou já coletados." };
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
    return { success: false, message: "Erro ao atualizar pedidos." };
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * 4. AÇÃO SIMPLIFICADA: Finalizar Entrega.
 * Ao receber o status 'entregue', o sistema assume que o pedido foi finalizado e pago.
 */
export async function updateDeliveryStatusAction(orderId: string, newStatus: 'entregue') {
  const supabase = await createClient();

  // 1. Busca o status atual para histórico
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!currentOrder) return { success: false, message: "Pedido não encontrado." };

  // 2. Atualiza o pedido para 'entregue'
  const { error: updateError } = await supabase
    .from("orders")
    .update({ 
      status: newStatus,
      last_status_change: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Erro ao atualizar status:", updateError);
    return { success: false, message: "Falha ao finalizar entrega." };
  }

  // 3. Registra no histórico (opcional, mas recomendado para auditoria)
  await supabase.from("order_history").insert({
    order_id: orderId,
    previous_status: currentOrder.status,
    new_status: newStatus,
    changed_at: new Date().toISOString()
  }).catch((err) => console.error("Erro silencioso ao criar histórico:", err));

  // 4. Revalida o cache para atualizar a UI imediatamente
  revalidatePath("/");
  
  return { success: true };
}
