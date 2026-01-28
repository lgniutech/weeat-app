"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface OrderItemInput {
  product_name: string;
  quantity: number;
  unit_price: number;
  observation?: string;
  removed_ingredients: string[]; // Nomes dos ingredientes
  selected_addons: { name: string; price: number }[]; // Snapshot dos addons
}

interface OrderInput {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "entrega" | "retirada";
  address?: string;
  paymentMethod: string;
  changeFor?: string;
  totalPrice: number;
  items: OrderItemInput[];
}

// CRIAR PEDIDO (Loja)
export async function createOrderAction(order: OrderInput) {
  const supabase = await createClient();

  // 1. Cria o Pedido Principal
  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: order.storeId,
      status: "pendente",
      customer_name: order.customerName,
      customer_phone: order.customerPhone, // Espera receber APENAS números aqui
      delivery_type: order.deliveryType,
      address: order.address,
      payment_method: order.paymentMethod,
      change_for: order.changeFor,
      total_price: order.totalPrice
    })
    .select()
    .single();

  if (orderError) {
    console.error("Erro ao criar pedido:", orderError);
    return { error: "Erro ao registrar pedido." };
  }

  // 2. Prepara os itens para inserção em lote
  const itemsToInsert = order.items.map(item => ({
    order_id: newOrder.id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    observation: item.observation,
    removed_ingredients: JSON.stringify(item.removed_ingredients),
    selected_addons: JSON.stringify(item.selected_addons)
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);

  if (itemsError) {
    console.error("Erro ao criar itens:", itemsError);
    // Idealmente faríamos rollback, mas Supabase via HTTP não tem transação simples exposta assim no client JS ainda sem RPC
    return { error: "Erro ao registrar itens do pedido." };
  }

  return { success: true, orderId: newOrder.id };
}

// BUSCAR PEDIDOS (Dashboard do Lojista)
export async function getStoreOrdersAction(storeId: string) {
    const supabase = await createClient();
    
    // Busca pedidos e seus itens
    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            items:order_items(*)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false }); // Mais recentes primeiro

    if (error) console.error(error);
    return data || [];
}

// ATUALIZAR STATUS (Dashboard do Lojista)
export async function updateOrderStatusAction(orderId: string, newStatus: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
    
    if (error) return { error: "Erro ao atualizar status" };
    
    revalidatePath("/");
    return { success: true };
}

// RASTREIO DE PEDIDOS (Cliente Final)
export async function getCustomerOrdersAction(phone: string) {
  const supabase = await createClient();
  
  // Garante que estamos buscando apenas números
  const clean = phone.replace(/\D/g, "")

  if (!clean) return []

  const { data, error } = await supabase
      .from("orders")
      .select(`
          *,
          store:stores(name, slug),
          items:order_items(*)
      `)
      // Busca segura: tenta encontrar o telefone limpo
      .eq("customer_phone", clean)
      .order("created_at", { ascending: false })
      .limit(5) // Limita aos últimos 5 pedidos

  if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return [];
  }
  
  return data || [];
}
