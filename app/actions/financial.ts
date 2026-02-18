"use server"

import { createClient } from "@/lib/supabase/server"
import { addDays, format, startOfDay, endOfDay, eachDayOfInterval, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export type FinancialSummary = {
  kpis: {
    grossRevenue: number
    netRevenue: number
    discountTotal: number
    ticketAverage: number
    ordersCount: number
    cancelledAmount: number
  }
  charts: {
    revenueByDay: { date: string; amount: number; label: string }[]
    paymentMix: { name: string; value: number; fill: string }[]
  }
  transactions: any[]
}

export async function getFinancialMetricsAction(
  storeId: string, 
  dateRange: { from: Date; to: Date }
): Promise<{ data?: FinancialSummary; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Ajustar datas para cobrir o dia inteiro
    const startDate = startOfDay(dateRange.from).toISOString()
    const endDate = endOfDay(dateRange.to).toISOString()

    // 1. Buscar Pedidos no Período
    // FILTRO APLICADO: Apenas Concluído ou Cancelado.
    // Pedidos "entregues" (na mesa) mas não fechados, ou em preparo, são ignorados.
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .in("status", ["concluido", "cancelado"]) 
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false })

    if (error) throw error

    // 2. Processar Dados
    // Active orders são apenas os concluídos (Receita Realizada)
    const activeOrders = orders.filter(o => o.status === 'concluido')
    
    const cancelledOrders = orders.filter(o => o.status === 'cancelado')

    // --- KPIs ---
    const grossRevenue = activeOrders.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    const discountTotal = activeOrders.reduce((acc, curr) => acc + (Number(curr.discount) || 0), 0)
    const netRevenue = grossRevenue - discountTotal
    const ordersCount = activeOrders.length
    const ticketAverage = ordersCount > 0 ? grossRevenue / ordersCount : 0
    const cancelledAmount = cancelledOrders.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)

    // --- GRÁFICO 1: Receita por Dia ---
    // Cria um array com todos os dias do intervalo para não ficar buraco no gráfico
    const daysInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    
    const revenueByDay = daysInterval.map(day => {
      const dayRevenue = activeOrders
        .filter(o => isSameDay(parseISO(o.created_at), day))
        .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
        
      return {
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "dd/MM", { locale: ptBR }),
        amount: dayRevenue
      }
    })

    // --- GRÁFICO 2: Mix de Pagamento ---
    const paymentGroups: Record<string, number> = {}
    activeOrders.forEach(order => {
      const method = order.payment_method || "Outros"
      paymentGroups[method] = (paymentGroups[method] || 0) + (Number(order.total_price) || 0)
    })

    // Cores para o gráfico
    const COLORS: Record<string, string> = {
      "pix": "#0ea5e9", // Sky 500
      "credito": "#8b5cf6", // Violet 500
      "debito": "#f59e0b", // Amber 500
      "dinheiro": "#22c55e", // Green 500
    }
    const defaultColor = "#94a3b8" // Slate 400

    const paymentMix = Object.entries(paymentGroups).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      value,
      fill: COLORS[name.toLowerCase()] || defaultColor
    })).sort((a, b) => b.value - a.value) // Ordenar do maior para o menor

    return {
      data: {
        kpis: {
          grossRevenue,
          netRevenue,
          discountTotal,
          ticketAverage,
          ordersCount,
          cancelledAmount
        },
        charts: {
          revenueByDay,
          paymentMix
        },
        transactions: orders // Retorna a lista contendo apenas Concluídos e Cancelados
      }
    }

  } catch (err: any) {
    console.error("Erro ao buscar financeiro:", err)
    return { error: "Falha ao carregar dados financeiros." }
  }
}
