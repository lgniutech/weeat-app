"use client"

import { useState, useEffect, useTransition } from "react"
import { getFinancialMetricsAction } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Bike } from "lucide-react"

export function FinancialDashboard({ store }: { store: any }) {
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('today')
  const [data, setData] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  // Busca os dados sempre que o período mudar
  useEffect(() => {
    startTransition(async () => {
      const metrics = await getFinancialMetricsAction(store.id, period)
      setData(metrics)
    })
  }, [store.id, period])

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  const isLoading = isPending || !data

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* HEADER & FILTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            {/* Título alterado para "Visão Geral" */}
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Visão Geral</h2>
            <p className="text-muted-foreground text-sm">Resumo da performance da sua loja.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg border dark:border-zinc-800 shadow-sm flex">
                <Button 
                    variant={period === 'today' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('today')}
                    className="text-xs h-8"
                >
                    Hoje
                </Button>
                <Button 
                    variant={period === '7days' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('7days')}
                    className="text-xs h-8"
                >
                    7 Dias
                </Button>
                <Button 
                    variant={period === '30days' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('30days')}
                    className="text-xs h-8"
                >
                    30 Dias
                </Button>
            </div>
        </div>
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data.revenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                             {period === 'today' ? "Vendas fechadas hoje" : "Vendas no período"}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>

        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.ordersCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                             Concluídos/Entregues
                        </p>
                    </>
                )}
            </CardContent>
        </Card>

        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data.averageTicket)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                             Média por pedido
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS SIMPLES (BARRAS) */}
      <div className="grid gap-4 md:grid-cols-2">
          
          {/* MÉTODOS DE PAGAMENTO */}
          <Card className="dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 dark:text-slate-100">
                      <CreditCard className="w-4 h-4 text-purple-500"/> Métodos de Pagamento
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/>)}</div>
                  ) : data.paymentStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Sem dados no período.</p>
                  ) : (
                      data.paymentStats.map((item: any) => (
                          <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                  <span className="font-medium capitalize dark:text-slate-300">{item.name}</span>
                                  <span className="text-muted-foreground">{item.count} ({Math.round(item.percentage)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${item.percentage}%` }}
                                  />
                              </div>
                          </div>
                      ))
                  )}
              </CardContent>
          </Card>

          {/* CANAIS DE VENDA */}
          <Card className="dark:bg-zinc-900 dark:border-zinc-800">
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 dark:text-slate-100">
                      <Bike className="w-4 h-4 text-emerald-500"/> Canais de Venda
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/>)}</div>
                  ) : data.typeStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Sem dados no período.</p>
                  ) : (
                      data.typeStats.map((item: any) => (
                          <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                  <span className="font-medium capitalize dark:text-slate-300">
                                      {item.name === 'mesa' ? 'Mesa / Salão' : (item.name === 'retirada' ? 'Retirada Balcão' : 'Delivery')}
                                  </span>
                                  <span className="text-muted-foreground">{item.count} ({Math.round(item.percentage)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${item.percentage}%` }}
                                  />
                              </div>
                          </div>
                      ))
                  )}
              </CardContent>
          </Card>

      </div>
    </div>
  )
}
