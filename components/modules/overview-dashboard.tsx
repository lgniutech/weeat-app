"use client"

import { useState, useEffect, useTransition } from "react"
import { getFinancialMetricsAction } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Bike, AlertCircle, Wallet } from "lucide-react"

export function OverviewDashboard({ store }: { store: any }) {
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('today')
  const [data, setData] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const metrics = await getFinancialMetricsAction(store.id, period)
        setData(metrics)
      } catch (error) {
        console.error("Erro ao buscar dashboard:", error)
        setData({ error: "Falha ao carregar dados." })
      }
    })
  }, [store.id, period])

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  // Estados de carregamento e erro
  const isLoading = isPending || !data

  if (!isLoading && data?.error) {
      return (
          <div className="flex flex-col items-center justify-center h-40 text-red-500 bg-red-50 rounded-lg border border-red-100 p-4 animate-in fade-in">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="font-bold">Erro ao carregar dashboard</p>
              <p className="text-sm opacity-80">{data.error}</p>
              <Button variant="outline" size="sm" className="mt-4 border-red-200 hover:bg-red-100 text-red-700" onClick={() => window.location.reload()}>
                  Tentar Novamente
              </Button>
          </div>
      )
  }

  // Garante arrays vazios se não existirem
  const paymentStats = data?.paymentStats || []
  const typeStats = data?.typeStats || []

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* HEADER & FILTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Visão Geral</h2>
            <p className="text-muted-foreground text-sm">Resumo da performance da sua loja.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg border dark:border-zinc-800 shadow-sm flex">
                <Button 
                    variant={period === 'today' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('today')}
                    className="text-xs h-8 font-medium"
                >
                    Hoje
                </Button>
                <Button 
                    variant={period === '7days' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('7days')}
                    className="text-xs h-8 font-medium"
                >
                    7 Dias
                </Button>
                <Button 
                    variant={period === '30days' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('30days')}
                    className="text-xs h-8 font-medium"
                >
                    30 Dias
                </Button>
            </div>
        </div>
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Faturamento */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <DollarSign className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data?.revenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/>
                             {period === 'today' ? "Vendas fechadas hoje" : "Acumulado no período"}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>

        {/* Card 2: Pedidos */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingBag className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.ordersCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>
                             Concluídos/Entregues
                        </p>
                    </>
                )}
            </CardContent>
        </Card>

        {/* Card 3: Ticket Médio */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                {isLoading ? <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data?.averageTicket)}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>
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
          <Card className="dark:bg-zinc-900 dark:border-zinc-800 border-l-4 border-l-primary/50">
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 dark:text-slate-100">
                      <Wallet className="w-4 h-4 text-primary"/> Métodos de Pagamento
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/>)}</div>
                  ) : paymentStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center opacity-50">
                          <CreditCard className="w-8 h-8 mb-2 text-slate-300"/>
                          <p className="text-sm text-muted-foreground italic">Sem dados no período.</p>
                      </div>
                  ) : (
                      paymentStats.map((item: any) => (
                          <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                  <span className="font-medium capitalize dark:text-slate-300">{item.name}</span>
                                  <span className="text-muted-foreground">{item.count} ({Math.round(item.percentage)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out opacity-80 hover:opacity-100" 
                                    style={{ width: `${item.percentage}%` }}
                                  />
                              </div>
                          </div>
                      ))
                  )}
              </CardContent>
          </Card>

          {/* CANAIS DE VENDA */}
          <Card className="dark:bg-zinc-900 dark:border-zinc-800 border-l-4 border-l-primary/50">
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 dark:text-slate-100">
                      <Bike className="w-4 h-4 text-primary"/> Canais de Venda
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded"/>)}</div>
                  ) : typeStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center opacity-50">
                           <Bike className="w-8 h-8 mb-2 text-slate-300"/>
                           <p className="text-sm text-muted-foreground italic">Sem dados no período.</p>
                      </div>
                  ) : (
                      typeStats.map((item: any) => (
                          <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                  <span className="font-medium capitalize dark:text-slate-300">
                                      {item.name === 'mesa' ? 'Mesa / Salão' : (item.name === 'retirada' ? 'Retirada Balcão' : 'Delivery')}
                                  </span>
                                  <span className="text-muted-foreground">{item.count} ({Math.round(item.percentage)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out opacity-80 hover:opacity-100" 
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
