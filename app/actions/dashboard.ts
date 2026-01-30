"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export async function getFinancialMetricsAction(storeId: string, dateRange: 'today' | '7days' | '30days' = 'today') {
  const supabase = await createClient();
  const now = new Date();
  
  let startDate = startOfDay(now);
  let endDate = endOfDay(now);

  // Define o intervalo de datas
  if (dateRange === '7days') {
    startDate = startOfDay(subDays(now, 7));
  } else if (dateRange === '30days') {
    startDate = startOfDay(subDays(now, 30));
  }

  // Busca APENAS pedidos concluídos (entregue)
  // Nota: Você pode decidir se quer incluir 'enviado' ou não. Geralmente financeiro é só o que foi entregue.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, total_price, payment_method, created_at, delivery_type")
    .eq("store_id", storeId)
    .neq("status", "cancelado") // Ignora cancelados
    .neq("status", "pendente")  // Ignora pendentes (venda não confirmada)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (error) {
    console.error("Erro ao buscar métricas:", error);
    return { error: "Erro ao carregar dados financeiros." };
  }

  // 1. Cálculos Totais
  const totalRevenue = orders.reduce((acc, order) => acc + order.total_price, 0);
  const totalOrders = orders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // 2. Agrupamento por Método de Pagamento
  const paymentMethods: Record<string, number> = {};
  orders.forEach(order => {
    const method = order.payment_method || 'Outros';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });

  // Transforma em array para o gráfico
  const paymentStats = Object.entries(paymentMethods)
    .map(([name, count]) => ({ name, count, percentage: (count / totalOrders) * 100 }))
    .sort((a, b) => b.count - a.count);

  // 3. Agrupamento por Tipo de Entrega (Delivery vs Mesa vs Retirada)
  const deliveryTypes: Record<string, number> = {};
  orders.forEach(order => {
    const type = order.delivery_type || 'outros';
    deliveryTypes[type] = (deliveryTypes[type] || 0) + 1;
  });
  
  const typeStats = Object.entries(deliveryTypes)
    .map(([name, count]) => ({ name, count, percentage: (count / totalOrders) * 100 }))
    .sort((a, b) => b.count - a.count);

  return {
    revenue: totalRevenue,
    ordersCount: totalOrders,
    averageTicket: averageTicket,
    paymentStats,
    typeStats,
    period: dateRange
  };
}
