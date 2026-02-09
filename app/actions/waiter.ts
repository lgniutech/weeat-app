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

  // Busca a configuração correta da loja
  const { data: store } = await supabase
    .from("stores")
    .select("total_tables")
    .eq("id", storeId)
    .single();
    
  const totalTables = store?.total_tables || 10; 

  // Busca pedidos ativos
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, 
      status, 
      total_price, 
      delivery_address, 
      customer_name,
      table_number,
      order_items ( product_name, quantity, unit_price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "entregue") 
    .neq("status", "cancelado");

  // Monta o mapa de mesas
  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Tenta encontrar pedido pela coluna table_number OU pelo endereço
    const order = activeOrders?.find(o => {
        if (o.table_number === tableNum) return true;
        if (!o.delivery_address) return false;
        const addressNum = o.delivery_address.replace(/\D/g, ''); 
        return addressNum === tableNum;
    });
    
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
  
  try {
      const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      // Inserção BLINDADA para aceitar os campos obrigatórios do banco
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: `Mesa ${tableNum}`,
        delivery_type: "mesa",
        delivery_address: `Mesa ${tableNum}`,
        table_number: tableNum, // IMPORTANTE: Campo que faltava
        payment_method: "card_machine", 
        status: "aceito", 
        items: items, // Backup JSONB
        total_price: total,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (orderError) {
        console.error("Erro SQL ao criar pedido:", orderError);
        return { error: `Erro ao abrir mesa: ${orderError.message}` };
      }

      if (items.length > 0) {
          const orderItemsData = items.map(i => ({
            order_id: order.id,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity,
            // Campos OBRIGATÓRIOS para o Schema do Supabase não reclamar de NULL
            removed_ingredients: '[]', 
            selected_addons: '[]',
            observation: ''
          }));

          const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);

          if (itemsError) {
            console.error("Erro SQL ao inserir itens:", itemsError);
          }
      }
      
      // Log no histórico
      await supabase.from("order_history").insert({
          order_id: order.id,
          new_status: 'aceito',
          changed_at: new Date().toISOString()
      });

      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) {
      console.error("Erro Interno:", err);
      return { error: "Erro interno no servidor." };
  }
}

// --- 4. ADICIONAR ITENS À MESA ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  try {
      const orderItemsData = newItems.map(i => ({
        order_id: orderId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity,
        removed_ingredients: '[]', 
        selected_addons: '[]',
        observation: ''
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) return { error: "Erro ao adicionar itens: " + itemsError.message };

      const addedTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const newTotal = currentTotal + addedTotal;

      const { data: currentOrder } = await supabase.from("orders").select("items").eq("id", orderId).single();
      const mergedItems = [...(currentOrder?.items || []), ...newItems];

      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          items: mergedItems,
          total_price: newTotal,
          status: "preparando", 
          last_status_change: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) return { error: "Erro ao atualizar total." };

      revalidatePath("/");
      return { success: true };

  } catch (err) {
      return { error: "Erro ao processar adição de itens." };
  }
}

// --- 5. FECHAR MESA ---
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  
  // Apenas marca como entregue para liberar a mesa da visualização
  const { error } = await supabase
      .from("orders")
      .update({ 
          status: "entregue",
          last_status_change: new Date().toISOString()
      })
      .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/${storeSlug}/staff/waiter`);
  return { success: true };
}
