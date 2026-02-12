"use client"

import { useState } from "react"
import { Search, Package, Clock, MapPin, CheckCircle2, Bike, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPhone } from "@/lib/utils" 
import { getCustomerOrdersAction } from "@/app/actions/order"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Aguardando Confirmação", color: "bg-yellow-500", icon: Clock },
  preparando: { label: "Em Preparo", color: "bg-blue-500", icon: Package },
  enviado: { label: "Saiu para Entrega", color: "bg-orange-500", icon: Bike },
  entregue: { label: "Entregue", color: "bg-green-600", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-red-600", icon: AlertCircle },
}

export default function TrackingPage() {
  const [phone, setPhone] = useState("")
  const [orders, setOrders] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Aplica a máscara visual enquanto digita
    setPhone(formatPhone(e.target.value))
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    // Pequena validação de tamanho mínimo (DDD + número)
    if (phone.length < 14) return 

    setLoading(true)
    const data = await getCustomerOrdersAction(phone)
    setOrders(data)
    setHasSearched(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                <Search className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rastrear Pedido</h1>
            <p className="text-slate-500">Digite seu WhatsApp para ver o status dos seus pedidos recentes.</p>
        </div>

        {/* Formulário de Busca */}
        <Card className="shadow-lg border-0">
            <CardContent className="p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Seu WhatsApp / Telefone</label>
                        <Input 
                            placeholder="(00) 00000-0000" 
                            value={phone} 
                            onChange={handlePhoneChange} 
                            className="h-12 text-lg text-center tracking-wider font-medium"
                            maxLength={15}
                        />
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading || phone.length < 14}>
                        {loading ? "Buscando..." : "Verificar Status"}
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-4">
            {hasSearched && orders.length === 0 && (
                <div className="text-center py-8 text-slate-400 animate-in fade-in">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum pedido recente encontrado para este número.</p>
                </div>
            )}

            {orders.map((order) => {
                const status = STATUS_MAP[order.status] || STATUS_MAP['pendente']
                return (
                    <Card key={order.id} className="overflow-hidden shadow-md animate-in slide-in-from-bottom-4 duration-500">
                        <div className={`h-2 w-full ${status.color}`} />
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2">{order.store?.name || "Loja"}</Badge>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <status.icon className={`w-5 h-5 ${status.color.replace('bg-', 'text-')}`} />
                                        {status.label}
                                    </CardTitle>
                                </div>
                                <span className="text-xs font-medium text-slate-400">
                                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3 pb-6">
                             <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-slate-700">
                                        <span>{item.quantity}x {item.product_name}</span>
                                    </div>
                                ))}
                             </div>
                             {order.delivery_type === 'entrega' && (
                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-[280px]">{order.address}</span>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>

        <div className="text-center mt-8">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 hover:underline">
                Voltar para o início
            </Link>
        </div>

      </div>
    </div>
  )
}
