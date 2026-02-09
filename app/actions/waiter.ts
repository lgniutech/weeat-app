"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied' | 'payment';

export type TableData = {
  id: string; // Número da mesa (1 a 20)
  status: TableStatus;
  orderId?: string;
  customerName?: string;
  total: number;
  items?: any[]; // Itens para mostrar no resumo
};

// Busca status das mesas (1 a 20)
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  // Busca pedidos ABERTOS do tipo 'mesa'
  // status != 'entregue' (entregue significa finalizado/pago/liberado)
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, 
      status, 
      total_price, 
      delivery_address, 
      customer_name,
      order_items ( name, quantity, price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "entregue") 
    .neq("status", "cancelado");

  // Gera array fixo de 20 mesas (pode ser configurável no futuro)
  const tables = Array.from({ length: 20 }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Tenta achar um pedido ativo para esta mesa
    // A string de endereço é salva como "Mesa: 10" ou "Mesa 10"
    const order = activeOrders?.find(o => 
      o.delivery_address?.includes(`Mesa: ${tableNum}`) || 
      o.delivery_address?.includes(`Mesa ${tableNum}`)
    );
    
    let status: TableStatus = 'free';
    if (order) {
      if (order.status === 'pagando') status = 'payment';
      else status = 'occupied';
    }

    return {
      id: tableNum,
      status: status,
      orderId: order?.id,
      customerName: order?.customer_name,
      total: order?.total_price || 0,
      items: order?.order_items || []
    };
  });

  return tables;
}

// Criar novo pedido para mesa (Abrir Mesa)
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Formata os items para o banco
  const dbItems = items.map(i => ({
    product_id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: i.price
  }));

  const { error } = await supabase.from("orders").insert({
    store_id: storeId,
    customer_name: `Mesa ${tableNum}`,
    customer_phone: "", 
    delivery_type: "mesa",
    delivery_address: `Mesa: ${tableNum}`,
    payment_method: "card_machine", 
    status: "aceito", // Já entra aceito pois foi o garçom que lançou
    items: dbItems, // JSONB legado (se usar)
    total_price: total
  });

  if (error) return { error: "Erro ao abrir mesa." };

  revalidatePath("/");
  return { success: true };
}

// Adicionar itens em mesa existente
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  // Precisamos adicionar os novos itens à tabela `order_items` (se você usa tabela relacional)
  // E atualizar o JSONB `items` no `orders`
  
  // 1. Busca pedido atual
  const { data: order } = await supabase.from("orders").select("items").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado" };

  const itemsToAdd = newItems.map(i => ({
    product_id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: i.price
  }));

  // Mescla arrays
  const updatedItems = [...(order.items || []), ...itemsToAdd];
  
  // Calcula novo total
  const addedTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const newTotal = currentTotal + addedTotal;

  // 2. Atualiza pedido
  const { error } = await supabase
    .from("orders")
    .update({ 
      items: updatedItems,
      total_price: newTotal,
      status: "preparando" // Volta para cozinha fazer os novos itens
    })
    .eq("id", orderId);

  if (error) return { error: "Erro ao atualizar pedido." };

  // Se sua arquitetura usa a tabela `order_items` separada, 
  // aqui você deveria inserir nela também. (Assumindo que o trigger do Supabase cuida ou que usamos JSONB principalmente para display rápido)

  revalidatePath("/");
  return { success: true };
}

// Resetar Mesa (Fechar/Liberar)
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  // Marca como entregue (finalizado)
  await supabase.from("orders").update({ status: "entregue" }).eq("id", orderId);
  revalidatePath(`/${storeSlug}/staff/waiter`);
}
