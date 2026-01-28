"use client"

import { useState } from "react"
import { StoreSettingsModal } from "@/components/modals/store-settings-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, Phone, Clock, MapPin, Edit } from "lucide-react"

interface StoreSettingsFormProps {
  store: any
}

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Formata o telefone para visualização
  const formatPhone = (phone: string) => {
    if (!phone) return "Não informado"
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }

  // Organiza horários para exibição
  const activeDays = store.settings?.business_hours?.filter((h: any) => h.active) || []

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Visão Geral</CardTitle>
            <CardDescription>
              Como sua loja aparece para os clientes.
            </CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6">
          
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome da Loja</p>
                <p className="font-semibold text-lg">{store.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CNPJ: {store.cnpj || "Não informado"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">WhatsApp de Pedidos</p>
                <p className="font-semibold text-lg">{formatPhone(store.whatsapp)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usado para receber notificações
                </p>
              </div>
            </div>
            
            {/* NOVO: Exibição da Cidade/Estado */}
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Localização</p>
                <p className="font-semibold text-lg">
                    {store.city ? `${store.city} - ${store.state}` : "Endereço não configurado"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Base para cálculo de frete (Futuro)
                </p>
              </div>
            </div>
          </div>

          <div className="border-t my-2" />

          {/* Resumo de Horários */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Horários de Funcionamento</h4>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {activeDays.length > 0 ? (
                activeDays.map((day: any, index: number) => (
                  <div key={index} className="bg-muted/40 p-2 rounded text-xs border">
                    <span className="font-medium block mb-1">{day.day}</span>
                    <span className="text-muted-foreground">{day.open} - {day.close}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic col-span-full">
                  Nenhum horário configurado. A loja aparecerá como fechada.
                </p>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* O Modal (Pop-up) é renderizado aqui, mas só aparece quando isModalOpen é true */}
      <StoreSettingsModal 
        store={store} 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  )
}
