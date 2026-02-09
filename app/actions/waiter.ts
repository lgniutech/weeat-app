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
  orderStatus?: string; // Status do pedido (preparando, pronto, etc)
};

// 1. BUSCAR STATUS DAS MESAS (Respeitando a quantidade real)
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  // A. Descobrir quantas mesas a loja tem
  const { data: store } = await supabase
    .from("stores")
    .select("tables_count")
    .eq("id", storeId)
    .single();
    
  const totalTables = store?.tables_count || 10; // Default 10 se der erro

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

  // C. Gerar Array com o tamanho correto
  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Procura pedido para esta mesa
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
      orderStatus: order?.status // Para mostrar se está pronto na cozinha
    };
  });

  return tables;
}

// 2. BUSCAR CARDÁPIO (Garantido para o Garçom)
export async function getWaiterMenuAction(storeId: string) {
  const supabase = await createClient();
  
  // Busca categorias COM produtos
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, 
      name,
      products (
        id, 
        name, 
        price, 
        description, 
        is_available,
        category_id
      )
    `)
    .eq("store_id", storeId)
    .order("index", { ascending: true });

  if (!categories) return [];

  return categories.map(cat => ({
    ...cat,
    // Garante que só vem produto disponível
    products: cat.products?.filter((p: any) => p.is_available === true)
  })).filter(cat => cat.products.length > 0);
}

// 3. ABRIR MESA
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
    status: "aceito", // Garçom lançou, já está aceito
    items: dbItems, 
    total_price: total
  });

  if (error) return { error: "Erro ao abrir mesa." };
  revalidatePath("/");
  return { success: true };
}

// 4. ADICIONAR ITENS
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  const { data: order } = await supabase.from("orders").select("items").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado" };

  const itemsToAdd = newItems.map(i => ({
    product_id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: i.price
  }));

  const updatedItems = [...(order.items || []), ...itemsToAdd];
  const addedTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const { error } = await supabase
    .from("orders")
    .update({ 
      items: updatedItems,
      total_price: currentTotal + addedTotal,
      status: "preparando" // Reativa na cozinha
    })
    .eq("id", orderId);

  if (error) return { error: "Erro ao atualizar pedido." };
  revalidatePath("/");
  return { success: true };
}

// 5. FECHAR MESA
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "entregue" }).eq("id", orderId);
  revalidatePath(`/${storeSlug}/staff/waiter`);
}
