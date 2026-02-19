"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { subDays, differenceInDays } from "date-fns"

interface FinancialChartsProps {
  revenueData: any[]
  paymentData: any[]
  dateRange: { from: Date; to: Date }
  onRangeChange: (range: { from: Date; to: Date }) => void
}

type Period = 'day' | 'month' | 'quarter' | 'four_months' | 'semester' | 'year' | 'custom'

export function FinancialCharts({ revenueData, paymentData, dateRange, onRangeChange }: FinancialChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('custom')

  // Sincroniza o Dropdown com o DateRange atual (caso seja alterado externamente)
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return

    const diff = differenceInDays(dateRange.to, dateRange.from)
    
    // Margem de erro pequena (1-2 dias) para acomodar horas/fuso
    if (diff === 0) setSelectedPeriod('day')
    else if (diff >= 28 && diff <= 31) setSelectedPeriod('month')
    else if (diff >= 88 && diff <= 92) setSelectedPeriod('quarter')
    else if (diff >= 118 && diff <= 122) setSelectedPeriod('four_months')
    else if (diff >= 178 && diff <= 182) setSelectedPeriod('semester')
    else if (diff >= 360 && diff <= 370) setSelectedPeriod('year')
    else setSelectedPeriod('custom')
  }, [dateRange])

  const handlePeriodChange = (value: Period) => {
    const today = new Date()
    let from = today
    const to = today

    switch (value) {
      case 'day':
        // Hoje
        from = today
        break
      case 'month':
        // Últimos 30 dias
        from = subDays(today, 30)
        break
      case 'quarter':
        // Últimos 90 dias
        from = subDays(today, 90)
        break
      case 'four_months':
        // Últimos 120 dias
        from = subDays(today, 120)
        break
      case 'semester':
        // Últimos 180 dias
        from = subDays(today, 180)
        break
      case 'year':
        // Últimos 365 dias
        from = subDays(today, 365)
        break
      default:
        return
    }

    onRangeChange({ from, to })
    setSelectedPeriod(value)
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

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

  // Lógica para intervalos padronizados no Eixo X
  const xAxisInterval = useMemo(() => {
    const count = revenueData.length
    
    // <= 15 dias: Mostra todos (1 em 1)
    if (count <= 15) return 0 
    
    // <= 60 dias: Mostra de 7 em 7 dias (Semanal)
    if (count <= 60) return 6 
    
    // <= 120 dias: Mostra de 15 em 15 dias (Quinzenal)
    if (count <= 120) return 14 
    
    // > 120 dias: Mostra de 30 em 30 dias (Mensal)
    return 29 
  }, [revenueData.length])

  return (
    <div className="grid gap-4 md:grid-cols-7">
      {/* GRÁFICO DE BARRAS - RECEITA */}
      <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Evolução da Receita</CardTitle>
          <Select
            value={selectedPeriod}
            onValueChange={(val: Period) => handlePeriodChange(val)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="month">Mês (30d)</SelectItem>
                <SelectItem value="quarter">Trimestre (90d)</SelectItem>
                <SelectItem value="four_months">Quadrimestre (120d)</SelectItem>
                <SelectItem value="semester">Semestre (180d)</SelectItem>
                <SelectItem value="year">Ano (365d)</SelectItem>
                <SelectItem value="custom" disabled>Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pl-2 pt-4">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                <XAxis 
                  dataKey="label" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  interval={xAxisInterval} // Aplica o intervalo calculado
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
