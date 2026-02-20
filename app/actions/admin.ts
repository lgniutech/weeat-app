"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateStoreGtmAction(
  storeId: string,
  gtmId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.ADMIN_SECRET_TOKEN) {
    return { success: false, error: "Configuração inválida." }
  }
  const supabase = await createClient()
  const { error } = await supabase.from("stores").update({ gtm_id: gtmId }).eq("id", storeId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getAdminStoresAction() {
  const supabase = await createClient()

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, gtm_id")
    .order("name", { ascending: true })

  if (error) return { error: error.message }

  // Para cada loja, busca resumo de pedidos e faturamento
  const storesWithStats = await Promise.all(
    (stores || []).map(async (store) => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_price, status, created_at")
        .eq("store_id", store.id)
        .neq("status", "cancelado")

      const totalOrders = orders?.length || 0
      const totalRevenue = orders?.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0) || 0

      return { ...store, totalOrders, totalRevenue }
    })
  )

  return { stores: storesWithStats }
}

export async function getStoreMetricsAction(storeId: string) {
  const supabase = await createClient()

  // Pedidos agrupados por dia (últimos 90 dias)
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_price, status, created_at")
    .eq("store_id", storeId)
    .neq("status", "cancelado")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })

  // Eventos de pixel
  const { data: pixelEvents } = await supabase
    .from("pixel_events")
    .select("event_name, value, created_at")
    .eq("store_id", storeId)
    .gte("created_at", since.toISOString())

  // Totais gerais
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, total_price, status")
    .eq("store_id", storeId)
    .neq("status", "cancelado")

  const totalOrders = allOrders?.length || 0
  const totalRevenue = allOrders?.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0) || 0

  // Agrupa pedidos por dia para o gráfico
  const ordersByDay: Record<string, { orders: number; revenue: number }> = {}
  for (const order of orders || []) {
    const day = order.created_at.slice(0, 10) // YYYY-MM-DD
    if (!ordersByDay[day]) ordersByDay[day] = { orders: 0, revenue: 0 }
    ordersByDay[day].orders += 1
    ordersByDay[day].revenue += Number(order.total_price) || 0
  }

  const chartData = Object.entries(ordersByDay).map(([date, data]) => ({
    date,
    pedidos: data.orders,
    faturamento: Math.round(data.revenue * 100) / 100,
  }))

  // Contagem de eventos de pixel
  const eventCounts = {
    view_item: 0,
    add_to_cart: 0,
    begin_checkout: 0,
    purchase: 0,
  }
  for (const event of pixelEvents || []) {
    if (event.event_name in eventCounts) {
      eventCounts[event.event_name as keyof typeof eventCounts] += 1
    }
  }

  // Taxas de conversão
  const addToCartRate = eventCounts.view_item > 0
    ? Math.round((eventCounts.add_to_cart / eventCounts.view_item) * 100)
    : 0
  const checkoutRate = eventCounts.add_to_cart > 0
    ? Math.round((eventCounts.begin_checkout / eventCounts.add_to_cart) * 100)
    : 0
  const purchaseRate = eventCounts.begin_checkout > 0
    ? Math.round((eventCounts.purchase / eventCounts.begin_checkout) * 100)
    : 0

  return {
    totalOrders,
    totalRevenue,
    eventCounts,
    conversionRates: { addToCartRate, checkoutRate, purchaseRate },
    chartData,
  }
}
