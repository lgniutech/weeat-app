"use server"

import { createClient } from "@/lib/supabase/server"
import { format, eachDayOfInterval, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export type FinancialSummary = {
  grossRevenue: number
  netRevenue: number
  discountTotal: number
  ticketAverage: number
  ordersCount: number
  cancelledAmount: number
}

export async function getFinancialMetricsAction(storeId: string, dateRange: { from: Date; to: Date }) {
  const supabase = await createClient()

  try {
    // Buscar ordens concluídas e canceladas no período
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['completed', 'cancelled'])
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .order('created_at', { ascending: true })

    if (ordersError) throw ordersError

    const activeOrders = orders.filter(o => o.status === 'completed')
    const cancelledOrders = orders.filter(o => o.status === 'cancelled')

    // --- CÁLCULO DE KPIs ---
    const grossRevenue = activeOrders.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    const discountTotal = activeOrders.reduce((acc, curr) => acc + (Number(curr.discount) || 0), 0)
    const netRevenue = grossRevenue - discountTotal
    const ordersCount = activeOrders.length
    const ticketAverage = ordersCount > 0 ? grossRevenue / ordersCount : 0
    const cancelledAmount = cancelledOrders.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)

    // --- GRÁFICO 1: Receita por Dia ---
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

    // --- GRÁFICO 2: Meios de Pagamento (Tradução e Cores) ---
    const paymentGroups: Record<string, number> = {}
    activeOrders.forEach(order => {
      let method = order.payment_method || "outros"
      method = method.toLowerCase()
      
      // Tradução e Normalização para Português
      if (method === 'credit_card' || method === 'credit' || method === 'credito') {
        method = 'Cartão de Crédito'
      } else if (method === 'debit_card' || method === 'debit' || method === 'debito' || method === 'card_machine') {
        method = 'Cartão de Débito'
      } else if (method === 'cash' || method === 'dinheiro' || method === 'money') {
        method = 'Dinheiro'
      } else if (method === 'pix') {
        method = 'Pix'
      } else {
        method = method.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      }

      paymentGroups[method] = (paymentGroups[method] || 0) + (Number(order.total_price) || 0)
    })

    // Paleta de cores com alto contraste (Estilo Power BI)
    const COLORS: Record<string, string> = {
      "Pix": "#00E5FF",           // Ciano Vibrante
      "Cartão de Crédito": "#7C3AED", // Violeta Profundo
      "Cartão de Débito": "#F59E0B",  // Laranja/Âmbar
      "Dinheiro": "#10B981",        // Verde Esmeralda
      "Outros": "#94A3B8"           // Cinza Slate
    }
    const defaultColor = "#CBD5E1"

    const paymentMix = Object.entries(paymentGroups).map(([name, value]) => ({
      name,
      value,
      fill: COLORS[name] || defaultColor
    })).sort((a, b) => b.value - a.value)

    return {
      data: {
        kpis: { grossRevenue, netRevenue, discountTotal, ticketAverage, ordersCount, cancelledAmount },
        charts: { revenueByDay, paymentMix },
        transactions: orders
      }
    }

  } catch (err: any) {
    console.error("Erro ao buscar financeiro:", err)
    return { error: "Falha ao carregar dados financeiros." }
  }
}
