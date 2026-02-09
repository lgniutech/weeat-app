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

  // CORREÇÃO: Usar 'total_tables' em vez de 'tables_count'
  const { data: store } = await supabase
    .from("stores")
    .select("total_tables")
    .eq("id", storeId)
    .single();
    
  // Se não tiver configurado, assume 10
  const totalTables = store?.total_tables || 10; 

  // B. Buscar pedidos ativos (que não foram entregues/finalizados)
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

  // C. Montar array de mesas
  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Procura se tem algum pedido ativo para esta mesa
    // Normalizamos a string para evitar erros com "Mesa 1" vs "Mesa: 1"
    const order = activeOrders?.find(o => {
        if (!o.delivery_address) return false;
        const addressNum = o.delivery_address.replace(/\D/g, ''); // Pega só os números
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

      // A. Inserir Pedido Principal
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: `Mesa ${tableNum}`,
        delivery_type: "mesa",
        delivery_address: `Mesa ${tableNum}`, // Padronizado sem dois pontos para facilitar busca
        payment_method: "card_machine", // Placeholder
        status: "aceito", // Já entra como aceito pois foi o garçom que lançou
        items: items, // JSONB para backup
        total_price: total,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (orderError) {
        console.error("Erro ao criar pedido (Banco):", orderError);
        return { error: `Erro no Banco: ${orderError.message}` };
      }

      if (!order) {
        return { error: "Erro desconhecido ao criar pedido." };
      }

      // B. Inserir Itens na tabela relacional
      if (items.length > 0) {
          const orderItemsData = items.map(i => ({
            order_id: order.id,
            product_name: i.name, // Ajustado para bater com esquema padrão se necessário
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity
          }));

          const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);

          if (itemsError) {
            console.error("Erro ao inserir itens (Banco):", itemsError);
            // Não abortamos pois o pedido foi criado, mas avisamos no log
          }
      }
      
      // Histórico
      await supabase.from("order_history").insert({
          order_id: order.id,
          new_status: 'aceito',
          changed_at: new Date().toISOString()
      });

      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) {
      console.error("Erro Crítico (Try/Catch):", err);
      return { error: "Erro interno no servidor." };
  }
}

// --- 4. ADICIONAR ITENS À MESA ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTotal: number) {
  const supabase = await createClient();

  try {
      // A. Inserir NOVOS itens na tabela relacional
      const orderItemsData = newItems.map(i => ({
        order_id: orderId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) {
          console.error(itemsError);
          return { error: "Erro ao adicionar itens no banco." };
      }

      // B. Atualizar Pedido Principal (Total e Status)
      const addedTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const newTotal = currentTotal + addedTotal;

      // Buscar itens antigos para manter JSONB atualizado (opcional, mas bom para integridade)
      const { data: currentOrder } = await supabase.from("orders").select("items").eq("id", orderId).single();
      const mergedItems = [...(currentOrder?.items || []), ...newItems];

      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          items: mergedItems,
          total_price: newTotal,
          status: "preparando", // Volta status para cozinha ver que tem coisa nova
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
  
  // Define como "entregue" para sair da lista de mesas ativas
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
