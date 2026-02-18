"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay } from "date-fns";

export type DashboardData = {
  metrics: {
    ordersCount: number;
    cancelledCount: number;
  };
  statusCounts: {
    queue: number;      // 'aceito'
    preparing: number;  // 'preparando'
    ready: number;      // 'enviado'/'pronto'
  };
  salesMix: {
    name: string;
    value: number;
    fill: string;
  }[];
  recentOrders: any[];
  unavailableProducts: any[];
};

export async function getDashboardOverviewAction(storeId: string): Promise<DashboardData | { error: string }> {
  const supabase = await createClient();
  const now = new Date();
  
  const startDate = startOfDay(now).toISOString();
  const endDate = endOfDay(now).toISOString();

  try {
    if (!storeId) throw new Error("ID da loja não fornecido.");

    // 1. Busca Pedidos do Dia (Sem somar totais monetários)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        delivery_type,
        created_at,
        customer_name,
        table_number,
        order_items (
          quantity,
          name: product_name
        )
      `)
      .eq("store_id", storeId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order('created_at', { ascending: false });

    if (ordersError) throw new Error(ordersError.message);

    // 2. Busca Produtos Indisponíveis
    const { data: unavailable } = await supabase
      .from("products")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("is_available", false)
      .limit(10); 

    // --- Processamento Operacional ---
    
    const normalize = (s: string) => s?.toLowerCase().trim() || '';

    const validOrders = orders?.filter(o => normalize(o.status) !== 'cancelado') || [];
    const cancelledOrders = orders?.filter(o => normalize(o.status) === 'cancelado') || [];

    const ordersCount = validOrders.length;

    // --- O FUNIL OPERACIONAL ---
    
    // 1. FILA (A Fazer): Status 'aceito' ou 'pendente'
    const queueCount = validOrders.filter(o => 
      ['aceito', 'pendente'].includes(normalize(o.status))
    ).length;
    
    // 2. COZINHA (No Fogo): Status 'preparando'
    const preparingCount = validOrders.filter(o => 
      ['preparando', 'em_preparo'].includes(normalize(o.status))
    ).length;
    
    // 3. EXPEDIÇÃO (Pronto): Status 'enviado', 'pronto' ou 'entregue'
    // Adicionado 'entregue' para contabilizar mesas servidas
    const readyCount = validOrders.filter(o => 
      ['enviado', 'pronto', 'saiu_para_entrega', 'entregue'].includes(normalize(o.status))
    ).length;

    // Mix de Canais (Por volume, não valor)
    const deliveryCount = validOrders.filter(o => o.delivery_type === 'delivery').length;
    const retiradaCount = validOrders.filter(o => o.delivery_type === 'retirada').length;
    const mesaCount = validOrders.filter(o => o.delivery_type === 'mesa').length;

    const salesMix = [
      { name: 'Delivery', value: deliveryCount, fill: '#3b82f6' }, // blue-500
      { name: 'Retirada', value: retiradaCount, fill: '#f59e0b' }, // amber-500
      { name: 'Mesa', value: mesaCount, fill: '#10b981' },     // emerald-500
    ].filter(i => i.value > 0);

    return {
      metrics: {
        ordersCount,
        cancelledCount: cancelledOrders.length
      },
      statusCounts: {
        queue: queueCount,
        preparing: preparingCount,
        ready: readyCount
      },
      salesMix,
      recentOrders: orders?.slice(0, 10) || [],
      unavailableProducts: unavailable || []
    };

  } catch (error: any) {
    console.error("Dashboard Error:", error);
    return { error: error.message || "Erro ao carregar dados." };
  }
}
