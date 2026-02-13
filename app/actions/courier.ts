"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCourierOrdersAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos prontos para entrega ou em rota
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      customer_phone,
      created_at,
      status,
      delivery_type,
      address,
      total_price,
      payment_method,
      last_status_change,
      order_items (
        id,
        quantity,
        product_name,
        observation
      )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "entrega")
    .in("status", ["enviado", "em_rota"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos para entrega:", error);
    return [];
  }

  return data || [];
}

export async function updateCourierStatusAction(orderIds: string[], newStatus: "em_rota" | "concluido") {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // VERIFICAÇÃO DE SEGURANÇA (Conflito de Entregadores)
  if (newStatus === "em_rota") {
    // Verifica se os pedidos selecionados AINDA estão disponíveis (status 'enviado')
    const { data: availableOrders, error: checkError } = await supabase
      .from("orders")
      .select("id")
      .in("id", orderIds)
      .eq("status", "enviado");

    // Se houver erro, ou se a quantidade encontrada for menor que a solicitada,
    // significa que algum pedido já mudou de status (foi pego).
    if (checkError || !availableOrders || availableOrders.length !== orderIds.length) {
      return { 
        success: false, 
        message: "Ops! Um ou mais pedidos selecionados já foram pegos por outro entregador. A lista será atualizada." 
      };
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ 
      status: newStatus, 
      last_status_change: now 
    })
    .in("id", orderIds);

  if (error) {
    console.error(`Erro ao atualizar pedidos para ${newStatus}:`, error);
    return { success: false, message: "Erro ao atualizar status." };
  }

  // Registrar no histórico
  for (const id of orderIds) {
    await supabase.from("order_history").insert({
      order_id: id,
      new_status: newStatus,
      changed_at: now
    });
  }

  revalidatePath("/");
  return { success: true };
}
