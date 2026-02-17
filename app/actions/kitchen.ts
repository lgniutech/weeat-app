"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // 1. Busca pedidos que tenham status de cozinha (aceito/preparando)
  // E faz o filtro !inner nos itens para garantir que o pedido só venha se tiver itens de cozinha
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
      order_items!inner (
        id,
        quantity,
        name: product_name, 
        observation,
        removed_ingredients,
        selected_addons,
        status,
        send_to_kitchen
      )
    `)
    .eq("store_id", storeId)
    .in("status", ["aceito", "preparando"])
    .eq("order_items.send_to_kitchen", true) // FILTRO CRUCIAL: Só traz itens que vão para cozinha
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos da cozinha:", error);
    return [];
  }

  // Nota: O filtro !inner acima garante que orders sem itens de cozinha não venham.
  // E o .eq('order_items.send_to_kitchen', true) garante que no array order_items só venham os de cozinha.
  
  return data || [];
}

export async function advanceKitchenStatusAction(orderId: string, currentStatus: string) {
  const supabase = await createClient();
  let nextStatus = "";

  if (currentStatus === 'aceito') nextStatus = 'preparando';
  else if (currentStatus === 'preparando') nextStatus = 'enviado';
  else return { success: false, message: "Status inválido." };

  const now = new Date().toISOString();
  
  // Se vai finalizar (enviar), marcamos APENAS os itens de cozinha como concluídos.
  // Os itens de bar (que não estão na tela) não devem ser afetados cegamente por essa ação de massa,
  // embora, se o pedido inteiro for 'enviado', subentende-se que tudo foi.
  // Mas para segurança, vamos focar nos itens de cozinha.
  const itemStatus = nextStatus === 'enviado' ? 'concluido' : 'preparando';

  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus, last_status_change: now })
    .eq("id", orderId);

  if (error) return { success: false, message: "Erro ao atualizar pedido." };

  // Atualiza apenas os itens que estão sob responsabilidade da cozinha
  if (nextStatus === 'enviado') {
      await supabase
        .from("order_items")
        .update({ status: itemStatus })
        .eq("order_id", orderId)
        .eq("send_to_kitchen", true); // Só marca como concluído o que é da cozinha
  } else {
      // Se for "preparando", marca tudo, pois o pedido está em produção
      await supabase
        .from("order_items")
        .update({ status: itemStatus })
        .eq("order_id", orderId)
        .eq("send_to_kitchen", true);
  }

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

    // 2. Verifica se todos os itens DE COZINHA desse pedido já foram concluídos
    const { data: items } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId)
        .eq("send_to_kitchen", true); // Olha só para a cozinha

    const allKitchenDone = items?.every(i => i.status === 'concluido');

    // 3. Se todos da cozinha estiverem prontos, finaliza o status DO PEDIDO NA COZINHA.
    // Nota: O pedido pode ter itens de bar pendentes, mas para a cozinha, ele sumirá da tela "Preparando" se mudarmos o status principal.
    // Se mudarmos o status do pedido para 'enviado', ele some da tela da cozinha (conf. query acima).
    // Isso é o desejado: a cozinha acabou a parte dela.
    if (allKitchenDone) {
        await supabase
            .from("orders")
            .update({ 
                status: 'enviado', 
                last_status_change: new Date().toISOString()
            })
            .eq("id", orderId);
        
        return { success: true, orderFinished: true };
    }

    // Caso contrário, garante que o pedido está "preparando"
    await supabase
        .from("orders")
        .update({ status: 'preparando' })
        .eq("id", orderId)
        .eq("status", "aceito"); 

    revalidatePath("/");
    return { success: true, orderFinished: false };
}
