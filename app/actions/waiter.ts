"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Busca o status de todas as mesas (1 a 20)
export async function getTablesStatusAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos ABERTOS do tipo 'mesa'
  const { data: activeOrders } = await supabase
    .from("orders")
    .select("id, status, total_price, delivery_address, customer_name")
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "entregue")  // Entregue = Mesa fechada/liberada
    .neq("status", "cancelado");

  // Mapeia para um formato fácil de consumir
  // delivery_address geralmente guardamos como "Mesa: 10"
  const tables = Array.from({ length: 20 }, (_, i) => {
    const tableNum = (i + 1).toString();
    const order = activeOrders?.find(o => o.delivery_address === `Mesa: ${tableNum}`);
    
    return {
      id: tableNum,
      status: order ? (order.status === 'pagando' ? 'payment' : 'occupied') : 'free',
      orderId: order?.id,
      customerName: order?.customer_name,
      total: order?.total_price || 0
    };
  });

  return tables;
}

// Cria um pedido para a mesa
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const { error } = await supabase.from("orders").insert({
    store_id: storeId,
    customer_name: `Mesa ${tableNum}`,
    customer_phone: "", // Não obrigatório para mesa
    delivery_type: "mesa",
    delivery_address: `Mesa: ${tableNum}`,
    payment_method: "card_machine", // Padrão
    status: "aceito", // Vai direto para "Aceito" (ou "preparando" se preferir)
    items: items, // JSONB
    total_price: total
  });

  if (error) return { error: "Erro ao abrir mesa." };
  
  // Cria os itens na tabela relacional também (para estatísticas)
  // (Simplificado aqui, idealmente usaria a mesma lógica do order.ts principal)

  revalidatePath("/");
  return { success: true };
}

// Adiciona itens a uma mesa JÁ ABERTA
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  // 1. Busca os itens atuais
  const { data: order } = await supabase.from("orders").select("items").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado" };

  const updatedItems = [...(order.items || []), ...newItems];
  const itemsTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const newTotal = currentTotal + itemsTotal;

  // 2. Atualiza o pedido
  const { error } = await supabase
    .from("orders")
    .update({ 
      items: updatedItems,
      total_price: newTotal,
      status: "preparando" // Volta para cozinha se tiver item novo
    })
    .eq("id", orderId);

  if (error) return { error: "Erro ao adicionar itens." };
  revalidatePath("/");
  return { success: true };
}

// Solicita o fechamento da conta
export async function requestBillAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "pagando" }).eq("id", orderId);
  revalidatePath(`/${storeSlug}/staff/waiter`);
}

// Fecha a mesa (libera) - Usado quando o cliente paga
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "entregue" }).eq("id", orderId);
  revalidatePath(`/${storeSlug}/staff/waiter`);
}
