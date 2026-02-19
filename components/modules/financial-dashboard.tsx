"use client"

import { useState, useEffect, useTransition } from "react"
import { getFinancialMetricsAction, type FinancialSummary } from "@/app/actions/financial"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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
      const result = await getFinancialMetricsAction(storeId, { from: date.from!, to: date.to! })
      if (result.data) {
        setData(result.data)
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [storeId, date])

  // Handler para quando o período é alterado via Dropdown no Gráfico
  const handleRangeChange = (range: { from: Date; to: Date }) => {
    setDate(range)
  }

  // Lógica de Exportação Excel (.xlsx)
  const handleExportExcel = () => {
    if (!data?.transactions) return

    const worksheetData = data.transactions.map((t) => {
      const paymentMethod = t.payment_method 
        ? t.payment_method.replace("_", " ").toUpperCase() 
        : "-"

      const statusLabel = t.status === 'cancelado' ? 'Cancelado' : 'Concluído'
      
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

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    const columnWidths = [
      { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, 
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    ]
    worksheet['!cols'] = columnWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Financeiro")

    const fileName = `relatorio_financeiro_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  // Lógica de Geração de PDF (Limpo/Extrato)
  const handleExportPDF = () => {
    if (!data?.transactions || !date?.from || !date?.to) return

    const doc = new jsPDF()

    // --- Cabeçalho ---
    doc.setFontSize(18)
    doc.text("Extrato Financeiro - WeEat", 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100)
    const periodStr = `Período: ${format(date.from, "dd/MM/yyyy")} até ${format(date.to, "dd/MM/yyyy")}`
    doc.text(periodStr, 14, 30)

    // --- Resumo Rápido ---
    const totalRevenue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      data.transactions.reduce((acc, curr) => acc + (curr.status !== 'cancelado' ? curr.total_price : 0), 0)
    )
    const totalOrders = data.transactions.length
    
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text(`Total de Vendas: ${totalRevenue}`, 14, 40)
    doc.text(`Total de Pedidos: ${totalOrders}`, 14, 46)

    // --- Tabela ---
    const tableBody = data.transactions.map((t) => [
      format(new Date(t.created_at), "dd/MM HH:mm", { locale: ptBR }),
      t.customer_name || "Consumidor",
      t.delivery_type ? t.delivery_type.toUpperCase() : "-",
      t.payment_method ? t.payment_method.replace("_", " ").toUpperCase() : "-",
      t.status === 'cancelado' ? 'CANCELADO' : 'CONCLUÍDO',
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.total_price)
    ])

    autoTable(doc, {
      startY: 55,
      head: [['Data', 'Cliente', 'Tipo', 'Pagamento', 'Status', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      // Customização de cor para status Cancelado
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const status = data.cell.raw as string
          if (status === 'CANCELADO') {
            data.cell.styles.textColor = [220, 38, 38] // Vermelho
          } else {
            data.cell.styles.textColor = [22, 163, 74] // Verde
          }
        }
      }
    })

    // Rodapé
    const pageCount = doc.internal.pages.length - 1
    doc.setFontSize(8)
    doc.setTextColor(150)
    const generatedDate = `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`
    doc.text(generatedDate, 14, doc.internal.pageSize.height - 10)

    // Download
    doc.save(`extrato_financeiro_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER DE CONTROLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            
            <Button onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
        </div>
      </div>

      {data ? (
        <>
            <FinancialCards data={data.kpis} />
            
            <div className="mt-6">
                <FinancialCharts 
                  revenueData={data.charts.revenueByDay} 
                  paymentData={data.charts.paymentMix}
                  dateRange={date || { from: new Date(), to: new Date() }}
                  onRangeChange={handleRangeChange}
                />
            </div>

            <div className="mt-6">
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
