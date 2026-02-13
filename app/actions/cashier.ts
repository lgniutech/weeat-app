"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- TIPOS ---
export type CashierOrder = {
  id: string;
  customer_name: string;
  status: string;
  total_price: number;
  created_at: string;
  table_number: string | null;
  delivery_type: string;
  payment_method: string | null; // Adicionado campo payment_method
  items: any[];
};

export type TableSummary = {
  table_number: string;
  customer_name?: string; // <--- NOVO CAMPO: Nome do Cliente
  orders: CashierOrder[];
  total: number;
  status: 'livre' | 'ocupada';
  last_activity: string;
};

// --- HELPER ---
export async function getStoreIdBySlug(slug: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("stores").select("id").eq("slug", slug).single();
    return data?.id || null;
}

// --- BUSCAR DADOS DO CAIXA ---
export async function getCashierDataAction(storeId: string) {
  const supabase = await createClient();

  const { data: activeOrders, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      status,
      total_price,
      created_at,
      table_number,
      delivery_type,
      payment_method,
      order_items (
        quantity,
        product_name,
        total_price,
        selected_addons
      )
    `)
    .eq("store_id", storeId)
    .neq("status", "concluido") 
    .neq("status", "cancelado")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar caixa:", error);
    return { tables: [], pickups: [] };
  }

  // --- PROCESSAMENTO ---
  const tablesMap = new Map<string, TableSummary>();
  
  activeOrders?.forEach((order: any) => {
    if (order.table_number) {
      const tableNum = order.table_number;
      
      if (!tablesMap.has(tableNum)) {
        tablesMap.set(tableNum, {
          table_number: tableNum,
          customer_name: order.customer_name, // Define o primeiro nome encontrado
          orders: [],
          total: 0,
          status: 'ocupada',
          last_activity: order.created_at
        });
      }

      const table = tablesMap.get(tableNum)!;
      table.orders.push(order);
      table.total += order.total_price;
      
      // LÓGICA DE NOME: Se o nome atual for genérico ("Mesa X") e o novo pedido tiver nome real, atualiza!
      const currentNameIsGeneric = !table.customer_name || table.customer_name.toLowerCase().includes("mesa");
      const newNameIsReal = order.customer_name && !order.customer_name.toLowerCase().includes("mesa");

      if (currentNameIsGeneric && newNameIsReal) {
          table.customer_name = order.customer_name;
      }

      if (new Date(order.created_at) > new Date(table.last_activity)) {
        table.last_activity = order.created_at;
      }
    }
  });

  const tables = Array.from(tablesMap.values()).sort((a, b) => 
    parseInt(a.table_number) - parseInt(b.table_number)
  );

  const pickups = activeOrders?.filter((o: any) => !o.table_number && o.delivery_type === 'retirada') || [];

  return { tables, pickups };
}

// --- FECHAR MESA ---
export async function closeTableAction(storeId: string, tableNumber: string, paymentMethod: string) {
  const supabase = await createClient();

  const { data: ordersToClose } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("table_number", tableNumber)
    .neq("status", "concluido") 
    .neq("status", "cancelado");

  if (!ordersToClose || ordersToClose.length === 0) return { error: "Mesa já encerrada." };

  const ids = ordersToClose.map(o => o.id);

  const { error } = await supabase
    .from("orders")
    .update({ 
      status: 'concluido', 
      payment_method: paymentMethod,
      last_status_change: new Date().toISOString()
    })
    .in("id", ids);
    
  await supabase.from("order_items").update({ status: 'concluido' }).in("order_id", ids);

  if (error) return { error: "Erro ao fechar mesa." };

  revalidatePath("/");
  return { success: true };
}

export async function deliverPickupOrderAction(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: 'concluido', last_status_change: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: "Erro ao atualizar pedido." };

  revalidatePath("/");
  return { success: true };
}

export async function cancelOrderAction(orderId: string) {
    const supabase = await createClient();
    await supabase.from("orders").update({ status: 'cancelado' }).eq("id", orderId);
    revalidatePath("/");
}
