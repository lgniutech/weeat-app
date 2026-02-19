"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface TransactionsTableProps {
  transactions: any[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatPaymentMethod = (method?: string) => {
    if (!method) return "-"
    const m = method.toLowerCase()
    if (m === 'credit_card' || m === 'credit') return 'Cartão de Crédito'
    if (m === 'debit_card' || m === 'debit') return 'Cartão de Débito'
    if (m === 'cash') return 'Dinheiro'
    if (m === 'pix') return 'Pix'
    return method.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Transações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma transação encontrada no período.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{order.customer_name || "N/A"}</TableCell>
                    <TableCell className="capitalize">{order.delivery_type}</TableCell>
                    <TableCell>{formatPaymentMethod(order.payment_method)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${order.status === 'cancelado' 
                          ? 'border-red-500 text-red-500 bg-red-50' 
                          : 'border-green-500 text-green-500 bg-green-50'}
                      `}>
                        {order.status === 'cancelado' ? 'Cancelado' : 'Concluído'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(order.total_price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
