"use client"

import { useState, useEffect, useTransition } from "react"
import { getFinancialMetricsAction, type FinancialSummary } from "@/app/actions/financial"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileSpreadsheet, Printer, RefreshCw } from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

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

  // Lógica de Exportação Excel (.xlsx)
  const handleExportExcel = () => {
    if (!data?.transactions) return

    // 1. Formata os dados para o Excel
    const worksheetData = data.transactions.map((t) => {
      // Formatação simples do método de pagamento
      const paymentMethod = t.payment_method 
        ? t.payment_method.replace("_", " ").toUpperCase() 
        : "-"

      // Formatação do status igual à tabela visual
      const statusLabel = t.status === 'cancelado' ? 'Cancelado' : 'Concluído'
      
      // Capitaliza o tipo de entrega
      const deliveryType = t.delivery_type 
        ? t.delivery_type.charAt(0).toUpperCase() + t.delivery_type.slice(1)
        : "N/A"

      return {
        "ID": t.id,
        "Data/Hora": format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        "Cliente": t.customer_name || "N/A",
        "Tipo": deliveryType,
        "Pagamento": paymentMethod,
        "Status": statusLabel,
        "Valor Total": t.total_price,
        "Desconto": t.discount || 0
      }
    })

    // 2. Cria a planilha (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    // Ajusta a largura das colunas (Opcional, para melhor visualização)
    const columnWidths = [
      { wch: 10 }, // ID
      { wch: 20 }, // Data/Hora
      { wch: 30 }, // Cliente
      { wch: 15 }, // Tipo
      { wch: 20 }, // Pagamento
      { wch: 15 }, // Status
      { wch: 15 }, // Valor Total
      { wch: 10 }, // Desconto
    ]
    worksheet['!cols'] = columnWidths

    // 3. Cria o arquivo (Workbook) e adiciona a planilha
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Financeiro")

    // 4. Gera o download do arquivo .xlsx
    const fileName = `relatorio_financeiro_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    XLSX.writeFile(workbook, fileName)
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

            <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
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
