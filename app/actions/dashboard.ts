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
    queue: number;      // Corrigido: 'aceito' (Fila da Cozinha)
    preparing: number;  // Corrigido: 'preparando' (Em produção)
    ready: number;      // Corrigido: 'enviado' (Expedição/Pronto)
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

    // 1. Busca Pedidos do Dia
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_price,
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

    // --- Processamento Lógico (Alinhado com a Staff) ---
    
    const normalize = (s: string) => s?.toLowerCase().trim() || '';

    const validOrders = orders?.filter(o => normalize(o.status) !== 'cancelado') || [];
    const cancelledOrders = orders?.filter(o => normalize(o.status) === 'cancelado') || [];

    // Métricas Financeiras
    const revenue = validOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const ordersCount = validOrders.length;
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;

    // --- O FUNIL OPERACIONAL REAL ---
    // 1. FILA (A Fazer na Cozinha): Status 'aceito'
    // O pedido entra como 'aceito' no `createOrderAction`
    const queueCount = validOrders.filter(o => 
      normalize(o.status) === 'aceito' || normalize(o.status) === 'pendente'
    ).length;
    
    // 2. PREPARANDO (Fogo): Status 'preparando'
    const preparingCount = validOrders.filter(o => 
      ['preparando', 'em_preparo'].includes(normalize(o.status))
    ).length;
    
    // 3. PRONTO/EXPEDIÇÃO: Status 'enviado' (Saiu da cozinha)
    // O `advanceKitchenStatusAction` move para 'enviado'
    const readyCount = validOrders.filter(o => 
      ['enviado', 'pronto', 'saiu_para_entrega'].includes(normalize(o.status))
    ).length;

    // Mix de Vendas
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
