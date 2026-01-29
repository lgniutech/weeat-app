"use client"

import { useState } from "react"
import { updateStoreDeliverySettingsAction } from "@/app/actions/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Bike, Clock, DollarSign } from "lucide-react"

export function DeliverySettings({ store }: { store: any }) {
    const [loading, setLoading] = useState(false)
    const [fee, setFee] = useState(store.delivery_fee || 0)
    const [minOrder, setMinOrder] = useState(store.min_order_value || 0)
    const [timeMin, setTimeMin] = useState(store.estimated_time_min || 30)
    const [timeMax, setTimeMax] = useState(store.estimated_time_max || 50)

    const handleSave = async () => {
        setLoading(true)
        const res = await updateStoreDeliverySettingsAction(store.id, {
            deliveryFee: Number(fee),
            minOrderValue: Number(minOrder),
            timeMin: Number(timeMin),
            timeMax: Number(timeMax)
        })
        setLoading(false)
        if (res.error) {
            alert("Erro ao salvar: " + res.error)
        } else {
            alert("Configurações de entrega salvas com sucesso!")
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bike className="w-5 h-5" /> Logística e Entrega
                </CardTitle>
                <CardDescription>Defina taxas, pedido mínimo e prazos para seus clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Taxa de Entrega (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="number" 
                                className="pl-9" 
                                value={fee} 
                                onChange={e => setFee(e.target.value)} 
                                step="0.50"
                                min="0"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Será somado ao total apenas no delivery.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Pedido Mínimo (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="number" 
                                className="pl-9" 
                                value={minOrder} 
                                onChange={e => setMinOrder(e.target.value)} 
                                step="1.00"
                                min="0"
                            />
                        </div>
                         <p className="text-[10px] text-muted-foreground">Valor mínimo em produtos para aceitar o pedido.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Tempo de Entrega Estimado (Minutos)</Label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="number" 
                                className="pl-9" 
                                placeholder="Mín (ex: 30)" 
                                value={timeMin} 
                                onChange={e => setTimeMin(e.target.value)} 
                            />
                        </div>
                        <span className="text-muted-foreground font-medium">até</span>
                        <div className="relative flex-1">
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="number" 
                                className="pl-9" 
                                placeholder="Máx (ex: 50)" 
                                value={timeMax} 
                                onChange={e => setTimeMax(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Salvar Configurações"}
                </Button>
            </CardContent>
        </Card>
    )
}
