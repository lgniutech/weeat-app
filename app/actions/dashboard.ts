"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay } from "date-fns";

export type DashboardData = {
  metrics: {
    revenue: number;
    ordersCount: number;
    avgTicket: number;
    cancelledCount: number;
  };
  statusCounts: {
    pending: number;   
    preparing: number; 
    expedition: number; 
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
  
  // Define o intervalo "HOJE" (00:00 até 23:59)
  const startDate = startOfDay(now).toISOString();
  const endDate = endOfDay(now).toISOString();

  try {
    // 1. Busca Pedidos do Dia + Itens
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
        delivery_type,
        created_at,
        customer_name,
        order_items (
          quantity,
          name
        )
      `)
      .eq("store_id", storeId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order('created_at', { ascending: false });

    if (ordersError) throw new Error(ordersError.message);

    // 2. Busca Produtos Indisponíveis (Alerta de Estoque)
    const { data: unavailable, error: stockError } = await supabase
      .from("products")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("is_available", false)
      .limit(10); 

    if (stockError) console.error("Erro ao buscar estoque:", stockError);

    // --- Processamento em Memória ---
    
    // Separa válidos de cancelados
    const validOrders = orders?.filter(o => o.status !== 'cancelado') || [];
    const cancelledOrders = orders?.filter(o => o.status === 'cancelado') || [];

    // Métricas Financeiras
    const revenue = validOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const ordersCount = validOrders.length;
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;

    // Contagem por Status (Funil Operacional)
    const pendingCount = validOrders.filter(o => o.status === 'pendente').length;
    
    const preparingCount = validOrders.filter(o => 
      ['aceito', 'preparando', 'em_preparo'].includes(o.status)
    ).length;
    
    const expeditionCount = validOrders.filter(o => 
      ['enviado', 'saiu_para_entrega', 'pronto'].includes(o.status)
    ).length;

    // Mix de Vendas (Gráfico)
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
        revenue,
        ordersCount,
        avgTicket,
        cancelledCount: cancelledOrders.length
      },
      statusCounts: {
        pending: pendingCount,
        preparing: preparingCount,
        expedition: expeditionCount
      },
      salesMix,
      recentOrders: orders?.slice(0, 10) || [], // Top 10 recentes
      unavailableProducts: unavailable || []
    };

  } catch (error: any) {
    console.error("Erro no Dashboard:", error);
    return { error: "Erro ao carregar dados." };
  }
}
