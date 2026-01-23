"use client";

import { useActionState, useState } from "react";
import { updateStoreAction } from "@/app/actions/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Loader2, Phone, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StoreSettingsForm({ store }: { store: any }) {
  // Ajuste para garantir compatibilidade com versões do React/Next
  const [state, action, isPending] = useActionState(updateStoreAction, null);
  
  // Preencher estados iniciais com os dados do banco
  const [phone, setPhone] = useState(store.whatsapp || "");
  // Garante que hours seja um array, mesmo que venha nulo
  const [hours, setHours] = useState(store.settings?.business_hours || []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    setPhone(value);
  };

  const toggleDay = (index: number) => {
    const newHours = [...hours];
    newHours[index].active = !newHours[index].active;
    setHours(newHours);
  };

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    const newHours = [...hours];
    newHours[index][field] = value;
    setHours(newHours);
  };

  return (
    <form action={action} className="space-y-6">
      
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Nome e contatos visíveis para o cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input id="name" name="name" defaultValue={store.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="whatsapp" 
                  name="whatsapp"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={store.cnpj || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">O CNPJ não pode ser alterado.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Atualizar Logo</Label>
            <div className="flex items-center gap-4">
              {store.logo_url && (
                <div className="h-16 w-16 rounded-lg border overflow-hidden shrink-0 relative bg-muted">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={store.logo_url} 
                    alt="Logo atual" 
                    className="h-full w-full object-cover" 
                  />
                </div>
              )}
              <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />
          <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
            {hours.length > 0 ? hours.map((day: any, index: number) => (
              <div key={day.day || index} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-3 w-32">
                  <Switch 
                    checked={day.active} 
                    onCheckedChange={() => toggleDay(index)} 
                  />
                  <span className={day.active ? "font-medium" : "text-muted-foreground"}>
                    {day.day}
                  </span>
                </div>
                
                {day.active ? (
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <Input 
                      type="time" 
                      value={day.open}
                      onChange={(e) => updateTime(index, 'open', e.target.value)}
                      className="w-24 h-8 text-xs bg-background"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                      type="time" 
                      value={day.close}
                      onChange={(e) => updateTime(index, 'close', e.target.value)}
                      className="w-24 h-8 text-xs bg-background"
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs flex-1 text-right pr-2">Fechado</span>
                )}
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhum horário configurado.</p>}
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      
      {state?.success && (
        <Alert className="border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20">
          <Check className="h-4 w-4" />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
      </div>
    </form>
  );
}
