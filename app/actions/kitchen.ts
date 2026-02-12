"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos da cozinha (Aceitos ou Preparando)
  // Garante a seleção de removed_ingredients e selected_addons
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
        selected_addons,
        status 
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

  if (currentStatus === 'aceito') nextStatus = 'preparando';
  else if (currentStatus === 'preparando') nextStatus = 'enviado';
  else return { success: false, message: "Status inválido." };

  const now = new Date().toISOString();
  // Se o pedido for finalizado (enviado), marca todos os itens como concluídos também
  const itemStatus = nextStatus === 'enviado' ? 'concluido' : 'preparando';

  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus, last_status_change: now })
    .eq("id", orderId);

  if (error) return { success: false, message: "Erro ao atualizar pedido." };

  await supabase
    .from("order_items")
    .update({ status: itemStatus })
    .eq("order_id", orderId);

  revalidatePath("/");
  return { success: true };
}

export async function advanceItemStatusAction(itemId: string, orderId: string) {
    const supabase = await createClient();

    // 1. Marca o item específico como concluído
    const { error } = await supabase
        .from("order_items")
        .update({ status: 'concluido' })
        .eq("id", itemId);

    if (error) return { success: false, message: "Erro ao atualizar item." };

    // 2. Verifica se todos os itens desse pedido já foram concluídos
    const { data: items } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId);

    const allDone = items?.every(i => i.status === 'concluido');

    // 3. Se todos estiverem prontos, finaliza o pedido inteiro
    if (allDone) {
        await supabase
            .from("orders")
            .update({ 
                status: 'enviado', 
                last_status_change: new Date().toISOString()
            })
            .eq("id", orderId);
        
        return { success: true, orderFinished: true };
    }

    // Caso contrário, garante que o pedido está "preparando" (caso estivesse apenas "aceito")
    await supabase
        .from("orders")
        .update({ status: 'preparando' })
        .eq("id", orderId)
        .eq("status", "aceito"); 

    revalidatePath("/");
    return { success: true, orderFinished: false };
}
