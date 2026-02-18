"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO, getMonth, getYear, getQuarter } from "date-fns"
import { ptBR } from "date-fns/locale"

interface FinancialChartsProps {
  revenueData: any[]
  paymentData: any[]
}

type Granularity = 'daily' | 'monthly' | 'quarterly' | 'four_monthly' | 'semiannual' | 'yearly'

export function FinancialCharts({ revenueData, paymentData }: FinancialChartsProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Estilo compartilhado para o Tooltip se adaptar ao tema (Light/Dark)
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--popover-foreground))',
    borderRadius: '8px',
    borderWidth: '1px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  const itemStyle = {
    color: 'hsl(var(--popover-foreground))'
  };

  // Processamento dos dados com base na granularidade selecionada
  const processedData = useMemo(() => {
    if (!revenueData || revenueData.length === 0) return []

    // Se for diário, retorna como está, mas garante a ordenação por data
    if (granularity === 'daily') {
        return [...revenueData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    const grouped: Record<string, { date: string, amount: number, label: string, sortKey: number }> = {}

    revenueData.forEach(item => {
        const date = parseISO(item.date)
        const year = getYear(date)
        const month = getMonth(date) // 0-11
        
        let key = ''
        let label = ''
        let sortKey = 0

        switch (granularity) {
            case 'monthly':
                key = format(date, 'yyyy-MM')
                label = format(date, 'MMM/yy', { locale: ptBR })
                // Capitalizar primeira letra do mês (opcional, ex: jan -> Jan)
                label = label.charAt(0).toUpperCase() + label.slice(1)
                sortKey = parseInt(format(date, 'yyyyMM'))
                break
            case 'quarterly':
                const quarter = getQuarter(date)
                key = `${year}-Q${quarter}`
                label = `${quarter}º Trim/${year.toString().slice(2)}`
                sortKey = parseInt(`${year}${quarter}`)
                break
            case 'four_monthly':
                // Quadrimestre: 0-3 (Q1), 4-7 (Q2), 8-11 (Q3)
                const fourMonth = Math.floor(month / 4) + 1
                key = `${year}-QM${fourMonth}`
                label = `${fourMonth}º Quad/${year.toString().slice(2)}`
                sortKey = parseInt(`${year}${fourMonth}`)
                break
            case 'semiannual':
                const semester = month < 6 ? 1 : 2
                key = `${year}-S${semester}`
                label = `${semester}º Sem/${year.toString().slice(2)}`
                sortKey = parseInt(`${year}${semester}`)
                break
            case 'yearly':
                key = `${year}`
                label = `${year}`
                sortKey = year
                break
        }

        if (!grouped[key]) {
            grouped[key] = { date: key, amount: 0, label, sortKey }
        }
        grouped[key].amount += item.amount
    })

    return Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey)
  }, [revenueData, granularity])

  // Cálculo do intervalo do eixo X para visualização "limpa" e padronizada
  const xAxisInterval = useMemo(() => {
    // Para granularidades agregadas (meses, anos, etc), geralmente mostra todos os pontos
    if (granularity !== 'daily') return 0 
    
    const count = processedData.length
    
    // Lógica para intervalos padronizados conforme a quantidade de dias
    if (count <= 14) return 0 // Mostra todos (1 em 1 dia) se forem poucos
    if (count <= 30) return 6 // Mostra de 7 em 7 dias (aproximadamente semanal)
    if (count <= 60) return 14 // Mostra de 15 em 15 dias (aproximadamente quinzenal)
    
    return 29 // Mostra de 30 em 30 dias (aproximadamente mensal) para períodos longos
  }, [processedData.length, granularity])

  return (
    <div className="grid gap-4 md:grid-cols-7">
      {/* GRÁFICO DE BARRAS - RECEITA DIÁRIA */}
      <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Evolução da Receita</CardTitle>
          <Select
            value={granularity}
            onValueChange={(val: Granularity) => setGranularity(val)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="four_monthly">Quadrimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pl-2 pt-4">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                <XAxis 
                  dataKey="label" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  interval={xAxisInterval} // Intervalo dinâmico calculado
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                    cursor={{fill: 'var(--muted)', opacity: 0.2}}
                    contentStyle={tooltipStyle}
                    itemStyle={itemStyle}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Bar 
                  dataKey="amount" 
                  fill="currentColor" 
                  radius={[4, 4, 0, 0]} 
                  className="fill-primary" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICO DE PIZZA - MEIOS DE PAGAMENTO */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Meios de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
                {paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={paymentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {paymentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [formatCurrency(value), 'Total']}
                                contentStyle={tooltipStyle}
                                itemStyle={itemStyle}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sem dados de pagamento
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
