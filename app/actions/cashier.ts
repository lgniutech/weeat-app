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
  items: any[];
};

export type TableSummary = {
  table_number: string;
  orders: CashierOrder[];
  total: number;
  status: 'livre' | 'ocupada';
  last_activity: string;
};

// --- HELPER: BUSCAR ID PELO SLUG ---
export async function getStoreIdBySlug(slug: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("stores").select("id").eq("slug", slug).single();
    return data?.id || null;
}

// --- BUSCAR DADOS DO CAIXA (MESAS E RETIRADA) ---
export async function getCashierDataAction(storeId: string) {
  const supabase = await createClient();

  // Busca pedidos que NÃO estão finalizados (entregue/cancelado)
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
    .neq("status", "entregue")
    .neq("status", "cancelado")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar caixa:", error);
    return { tables: [], pickups: [] };
  }

  // --- PROCESSAMENTO ---
  
  // 1. Organizar Mesas (Agrupa pedidos pelo número da mesa)
  const tablesMap = new Map<string, TableSummary>();
  
  activeOrders?.forEach((order: any) => {
    // Apenas pedidos que têm número de mesa
    if (order.table_number) {
      const tableNum = order.table_number;
      
      if (!tablesMap.has(tableNum)) {
        tablesMap.set(tableNum, {
          table_number: tableNum,
          orders: [],
          total: 0,
          status: 'ocupada',
          last_activity: order.created_at
        });
      }

      const table = tablesMap.get(tableNum)!;
      table.orders.push(order);
      table.total += order.total_price;
      
      // Mantém a data da atividade mais recente
      if (new Date(order.created_at) > new Date(table.last_activity)) {
        table.last_activity = order.created_at;
      }
    }
  });

  // Ordena mesas numericamente (ex: 1, 2, 10)
  const tables = Array.from(tablesMap.values()).sort((a, b) => 
    parseInt(a.table_number) - parseInt(b.table_number)
  );

  // 2. Organizar Retirada/Balcão (Pedidos sem mesa e marcados como retirada)
  const pickups = activeOrders?.filter((o: any) => !o.table_number && o.delivery_type === 'retirada') || [];

  return { tables, pickups };
}

// --- AÇÃO: FECHAR CONTA DA MESA ---
// Muda o status de TODOS os pedidos daquela mesa para 'entregue'
export async function closeTableAction(storeId: string, tableNumber: string, paymentMethod: string) {
  const supabase = await createClient();

  // 1. Busca os IDs dos pedidos dessa mesa que estão abertos
  const { data: ordersToClose } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("table_number", tableNumber)
    .neq("status", "entregue")
    .neq("status", "cancelado");

  if (!ordersToClose || ordersToClose.length === 0) return { error: "Mesa já está fechada ou vazia." };

  const ids = ordersToClose.map(o => o.id);

  // 2. Atualiza todos para 'entregue' e salva o método de pagamento
  const { error } = await supabase
    .from("orders")
    .update({ 
      status: 'entregue',
      payment_method: paymentMethod 
    })
    .in("id", ids);

  if (error) return { error: "Erro ao fechar mesa." };

  revalidatePath("/");
  return { success: true };
}

// --- AÇÃO: ENTREGAR PEDIDO DE BALCÃO ---
export async function deliverPickupOrderAction(orderId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: 'entregue' })
    .eq("id", orderId);

  if (error) return { error: "Erro ao atualizar pedido." };

  revalidatePath("/");
  return { success: true };
}

// --- AÇÃO: CANCELAR PEDIDO INDIVIDUAL ---
// Útil para estorno ou correção antes de fechar a conta
export async function cancelOrderAction(orderId: string) {
    const supabase = await createClient();
    await supabase.from("orders").update({ status: 'cancelado' }).eq("id", orderId);
    revalidatePath("/");
}
