"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, TrendingDown, Wallet } from "lucide-react"

interface FinancialCardsProps {
  data: {
    grossRevenue: number
    netRevenue: number
    discountTotal: number
    ticketAverage: number
    ordersCount: number
    cancelledAmount: number
  }
}

export function FinancialCards({ data }: FinancialCardsProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.grossRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {data.ordersCount} pedidos válidos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.ticketAverage)}</div>
          <p className="text-xs text-muted-foreground">
            Média por pedido
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Descontos</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            - {formatCurrency(data.discountTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            Cupons e promoções
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-200 dark:border-l-red-900/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Perdidas</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatCurrency(data.cancelledAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            Em pedidos cancelados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
