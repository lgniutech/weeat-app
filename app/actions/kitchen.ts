"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getKitchenOrdersAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos que estão NA COZINHA ('preparando')
  // Ordena pelos mais antigos primeiro (FIFO - First In, First Out)
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      created_at,
      status,
      delivery_type,
      notes,
      order_items (
        quantity,
        name
        -- Se tiver addons salvos no banco, adicione aqui: add_ons
      )
    `)
    .eq("store_id", storeId)
    .eq("status", "preparando") 
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos da cozinha:", error);
    return [];
  }

  return data;
}

export async function markOrderReadyAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();

  // Atualiza para 'pronto_cozinha' (libera para o garçom/entregador)
  const { error } = await supabase
    .from("orders")
    .update({ status: "pronto_cozinha" })
    .eq("id", orderId);

  if (error) {
    return { error: "Erro ao atualizar pedido." };
  }

  revalidatePath(`/${storeSlug}/staff/kitchen`);
  return { success: true };
}
