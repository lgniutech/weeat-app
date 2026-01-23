"use client";

import { useActionState, useState } from "react";
import { createStoreAction } from "@/app/actions/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, Clock, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SetupPage() {
  const [state, action, isPending] = useActionState(createStoreAction, null);
  
  // Estado local para gerenciar os horários visualmente
  const [hours, setHours] = useState([
    { day: "Segunda", open: "08:00", close: "18:00", active: true },
    { day: "Terça", open: "08:00", close: "18:00", active: true },
    { day: "Quarta", open: "08:00", close: "18:00", active: true },
    { day: "Quinta", open: "08:00", close: "18:00", active: true },
    { day: "Sexta", open: "08:00", close: "18:00", active: true },
    { day: "Sábado", open: "09:00", close: "14:00", active: true },
    { day: "Domingo", open: "00:00", close: "00:00", active: false },
  ]);

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
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Configurar Loja</CardTitle>
            <CardDescription>
              Vamos deixar tudo pronto para você começar a vender.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-8">
              
              {/* Seção 1: Dados Básicos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                  Dados do Negócio
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Fantasia</Label>
                    <Input id="name" name="name" placeholder="Ex: Hamburgueria do Dev" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Link da Loja (Slug)</Label>
                  <div className="flex items-center">
                    <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground whitespace-nowrap">
                      weeat.app/
                    </span>
                    <Input id="slug" name="slug" placeholder="minha-loja" className="rounded-l-none" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logotipo</Label>
                  <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer" />
                </div>
              </div>

              <div className="h-[1px] bg-slate-200" />

              {/* Seção 2: Horários */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  Horário de Funcionamento
                </h3>
                
                {/* Input escondido para enviar o JSON dos horários via FormData */}
                <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />

                <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
                  {hours.map((day, index) => (
                    <div key={day.day} className="flex items-center justify-between gap-2 text-sm">
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
                            className="w-24 h-8 text-xs"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input 
                            type="time" 
                            value={day.close}
                            onChange={(e) => updateTime(index, 'close', e.target.value)}
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs flex-1 text-right pr-2">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {state?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                {isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Criando Loja...</>
                ) : (
                  <><Check className="mr-2 h-5 w-5" /> Salvar Tudo e Entrar</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
