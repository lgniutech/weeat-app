"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionsTableProps {
  transactions: any[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatPaymentMethod = (method?: string) => {
  if (!method) return "-"
  const m = method.toLowerCase()
  if (m === "credit_card" || m === "credit" || m === "credito") return "Cartão de Crédito"
  if (m === "debit_card" || m === "debit" || m === "debito") return "Cartão de Débito"
  if (m === "cash" || m === "dinheiro" || m === "money") return "Dinheiro"
  if (m === "pix") return "Pix"
  if (m === "card_machine" || m === "card machine" || m === "maquininha") return "Maquininha de Cartão"
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
            Nenhuma transação encontrada no período.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Transações{" "}
          <span className="text-muted-foreground font-normal text-sm">
            ({transactions.length} registros)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Data/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const isCancelled = t.status === "cancelado"
                const deliveryType = t.delivery_type
                  ? t.delivery_type.charAt(0).toUpperCase() + t.delivery_type.slice(1)
                  : "N/A"

                return (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {t.customer_name || "Consumidor"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deliveryType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatPaymentMethod(t.payment_method)}
                    </TableCell>
                    <TableCell>
                      {isCancelled ? (
                        <Badge variant="destructive" className="text-xs font-medium">
                          Cancelado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-green-600 border-green-600/30 bg-green-500/10"
                        >
                          Concluído
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right pr-6 text-sm font-medium ${
                        isCancelled ? "text-destructive line-through opacity-60" : ""
                      }`}
                    >
                      {formatCurrency(Number(t.total_price) || 0)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
