"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied' | 'payment';

export type TableData = {
  id: string;
  status: TableStatus;
  orderId?: string;
  customerName?: string;
  total: number;
  items?: any[];
  orderStatus?: string;
};

// --- 1. BUSCAR STATUS DAS MESAS ---
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  // A. Buscar config da loja (tables_count)
  const { data: store } = await supabase
    .from("stores")
    .select("tables_count")
    .eq("id", storeId)
    .single();
    
  // Se não tiver configurado, assume 10. Se configurou 5, usa 5.
  const totalTables = store?.tables_count || 10; 

  // B. Buscar pedidos ativos
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

  // C. Montar array
  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    const order = activeOrders?.find(o => 
      o.delivery_address === `Mesa: ${tableNum}` || 
      o.delivery_address === `Mesa ${tableNum}`
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
      items: order?.order_items || [],
      orderStatus: order?.status
    };
  });

  return tables;
}

// --- 2. BUSCAR CARDÁPIO ---
export async function getWaiterMenuAction(storeId: string) {
  const supabase = await createClient();
  
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, name,
      products (id, name, price, description, is_available, category_id)
    `)
    .eq("store_id", storeId)
    .order("index", { ascending: true });

  if (!categories) return [];

  return categories.map(cat => ({
    ...cat,
    products: cat.products?.filter((p: any) => p.is_available === true)
  })).filter(cat => cat.products.length > 0);
}

// --- 3. CRIAR PEDIDO (ABRIR MESA) ---
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // A. Inserir Pedido Principal
  const { data: order, error: orderError } = await supabase.from("orders").insert({
    store_id: storeId,
    customer_name: `Mesa ${tableNum}`,
    delivery_type: "mesa",
    delivery_address: `Mesa: ${tableNum}`,
    payment_method: "card_machine", 
    status: "aceito", 
    items: items, // JSONB para backup
    total_price: total
  }).select().single();

  if (orderError || !order) {
    console.error("Erro ao criar pedido:", orderError);
    return { error: "Erro ao abrir mesa." };
  }

  // B. Inserir Itens na tabela relacional (CORREÇÃO: Isso faltava!)
  const orderItemsData = items.map(i => ({
    order_id: order.id,
    product_id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: i.price
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);

  if (itemsError) {
    console.error("Erro ao inserir itens:", itemsError);
    // Não vamos abortar tudo, mas é bom logar
  }

  revalidatePath("/");
  return { success: true };
}

// --- 4. ADICIONAR ITENS À MESA ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  // A. Inserir NOVOS itens na tabela relacional
  const orderItemsData = newItems.map(i => ({
    order_id: orderId,
    product_id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: i.price
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
  if (itemsError) return { error: "Erro ao adicionar itens no banco." };

  // B. Atualizar Pedido Principal (Total e Status)
  const addedTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const newTotal = currentTotal + addedTotal;

  // Precisamos buscar os items antigos do JSONB para mesclar (apenas para manter o JSONB atualizado)
  const { data: currentOrder } = await supabase.from("orders").select("items").eq("id", orderId).single();
  const mergedItems = [...(currentOrder?.items || []), ...newItems];

  const { error: updateError } = await supabase
    .from("orders")
    .update({ 
      items: mergedItems,
      total_price: newTotal,
      status: "preparando" // Volta para cozinha
    })
    .eq("id", orderId);

  if (updateError) return { error: "Erro ao atualizar total." };

  revalidatePath("/");
  return { success: true };
}

// --- 5. FECHAR MESA ---
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "entregue" }).eq("id", orderId);
  revalidatePath(`/${storeSlug}/staff/waiter`);
}
