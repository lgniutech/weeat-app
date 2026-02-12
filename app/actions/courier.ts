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

  try {
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
  } catch (err) {
    console.error("Exceção ao buscar entregas:", err);
    return [];
  }
}

/**
 * Busca pedidos que já saíram para entrega (Status: 'em_rota').
 * Filtra PELO COURIER_ID para ser uma lista privada.
 */
export async function getActiveDeliveriesAction(storeId: string, courierId: string) {
  if (!courierId) return []; // Retorna vazio se ID não for fornecido

  const supabase = await createClient();

  try {
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
      .eq("courier_id", courierId)
      .order("last_status_change", { ascending: false });

    if (error) {
      console.error("Erro ao buscar entregas em andamento:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Exceção ao buscar entregas ativas:", err);
    return [];
  }
}

/**
 * Ação em LOTE: Assume vários pedidos de uma vez e atribui ao entregador.
 */
export async function startBatchDeliveriesAction(orderIds: string[], courierId: string) {
  const supabase = await createClient();

  if (!orderIds || orderIds.length === 0) {
    return { success: false, message: "Nenhum pedido selecionado." };
  }
  
  if (!courierId) {
    return { success: false, message: "Erro de autenticação do entregador." };
  }

  try {
    // 1. Verifica se os pedidos ainda estão com status 'enviado'
    const { data: validOrders, error: verifyError } = await supabase
      .from("orders")
      .select("id")
      .in("id", orderIds)
      .eq("status", "enviado");

    if (verifyError) {
        console.error("Erro na verificação de pedidos:", verifyError);
        return { success: false, message: "Erro ao verificar pedidos." };
    }

    if (!validOrders || validOrders.length === 0) {
      return { success: false, message: "Os pedidos selecionados não estão mais disponíveis." };
    }

    const validIds = validOrders.map(o => o.id);

    // 2. Atualiza status e vincula o entregador
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: 'em_rota',
        courier_id: courierId, 
        last_status_change: new Date().toISOString()
      })
      .in('id', validIds); 

    if (updateError) {
      console.error("Erro ao iniciar rota em lote:", updateError);
      return { success: false, message: "Erro ao atualizar pedidos no banco." };
    }

    // Registra histórico (opcional, mas recomendado)
    // Se desejar, descomente para criar log de histórico para cada pedido
    /*
    const historyEntries = validIds.map(id => ({
      order_id: id,
      previous_status: 'enviado',
      new_status: 'em_rota',
      changed_at: new Date().toISOString()
    }));
    await supabase.from("order_history").insert(historyEntries);
    */

    revalidatePath("/");
    return { success: true };

  } catch (err) {
    console.error("Exceção crítica ao iniciar lote:", err);
    return { success: false, message: "Erro interno do servidor." };
  }
}

/**
 * Atualiza o status da entrega individual (Apenas finalizar).
 */
export async function updateDeliveryStatusAction(orderId: string, newStatus: 'entregue') {
  const supabase = await createClient();

  try {
    // 1. Busca status atual
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
        return { success: false, message: "Pedido não encontrado." };
    }

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
  } catch (err) {
    console.error("Exceção ao atualizar status:", err);
    return { success: false, message: "Erro inesperado ao finalizar." };
  }
}
