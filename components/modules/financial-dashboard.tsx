"use client"

import { useState, useEffect, useTransition } from "react"
import { getFinancialMetricsAction, type FinancialSummary } from "@/app/actions/financial"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, Printer, RefreshCw } from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { FinancialCards } from "./financial/financial-cards"
import { FinancialCharts } from "./financial/financial-charts"
import { TransactionsTable } from "./financial/transactions-table"

export function FinancialDashboard({ storeId }: { storeId: string }) {
  // Estado de Data (Padrão: Últimos 7 dias)
  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  })

  const [data, setData] = useState<FinancialSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  // Função de Carregamento
  const loadData = () => {
    if (!storeId || !date?.from || !date?.to) return

    startTransition(async () => {
      const result = await getFinancialMetricsAction(storeId, { from: date.from, to: date.to })
      if (result.data) {
        setData(result.data)
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [storeId, date])

  // Lógica de Exportação Simples (CSV)
  const handleExportCSV = () => {
    if (!data?.transactions) return

    const headers = ["ID,Data,Cliente,Tipo,Pagamento,Status,Valor Total,Desconto"]
    const rows = data.transactions.map(t => 
      `${t.id},"${t.created_at}","${t.customer_name}",${t.delivery_type},${t.payment_method},${t.status},${t.total_price},${t.discount}`
    )
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `relatorio_financeiro_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Lógica de Impressão (PDF Nativo do Browser)
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:bg-white print:text-black">
      
      {/* HEADER DE CONTROLE (Oculto na impressão) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Financeiros</h2>
        
        <div className="flex flex-wrap items-center gap-2">
            {/* DATE PICKER */}
            <div className="grid gap-2">
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                        date.to ? (
                        <>
                            {format(date.from, "dd/MM/y", { locale: ptBR })} -{" "}
                            {format(date.to, "dd/MM/y", { locale: ptBR })}
                        </>
                        ) : (
                        format(date.from, "dd/MM/y", { locale: ptBR })
                        )
                    ) : (
                        <span>Selecione uma data</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(val: any) => setDate(val)}
                        numberOfMonths={2}
                        locale={ptBR}
                    />
                </PopoverContent>
                </Popover>
            </div>

            <Button variant="outline" size="icon" onClick={loadData} disabled={isPending} title="Atualizar">
                <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            </Button>

            <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
        </div>
      </div>

      {/* CABEÇALHO APENAS PARA IMPRESSÃO */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold mb-2">Relatório Financeiro</h1>
        <p className="text-sm">
            Período: {date?.from && format(date.from, "dd/MM/yyyy")} até {date?.to && format(date.to, "dd/MM/yyyy")}
        </p>
      </div>

      {data ? (
        <>
            <div className="print:break-inside-avoid">
                <FinancialCards data={data.kpis} />
            </div>
            
            <div className="print:break-inside-avoid mt-6">
                <FinancialCharts revenueData={data.charts.revenueByDay} paymentData={data.charts.paymentMix} />
            </div>

            <div className="print:break-before-page mt-6">
                <TransactionsTable transactions={data.transactions} />
            </div>
        </>
      ) : (
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            {isPending ? <div className="text-muted-foreground">Carregando dados...</div> : <div className="text-muted-foreground">Selecione um período para ver os dados.</div>}
        </div>
      )}
    </div>
  )
}
