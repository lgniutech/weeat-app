"use client";

import { useActionState, useState } from "react";
import { createStoreAction } from "@/app/actions/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, FileText, Phone, Check, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SetupPage() {
  const [state, action, isPending] = useActionState(createStoreAction, null);
  
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState([
    { day: "Segunda", open: "08:00", close: "18:00", active: true },
    { day: "Terça", open: "08:00", close: "18:00", active: true },
    { day: "Quarta", open: "08:00", close: "18:00", active: true },
    { day: "Quinta", open: "08:00", close: "18:00", active: true },
    { day: "Sexta", open: "08:00", close: "18:00", active: true },
    { day: "Sábado", open: "09:00", close: "14:00", active: true },
    { day: "Domingo", open: "00:00", close: "00:00", active: false },
  ]);

  // Máscaras
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);
    value = value.replace(/^(\d{2})(\d)/, "$1.$2");
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");
    setCnpj(value);
  };

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
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <form action={action}>
          <div className="space-y-6">
            
            {/* CARD 1: SEGURANÇA (Novo) */}
            <Card className="shadow-lg border-0 border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">Acesso</span>
                </div>
                <CardTitle>Sua Senha</CardTitle>
                <CardDescription>Defina a senha que você usará para entrar no WeEat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: DADOS DA LOJA */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                 <div className="flex items-center gap-2 mb-1">
                  <Store className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">Dados da Loja</span>
                </div>
                <CardTitle>Configurar Negócio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Fantasia</Label>
                  <Input id="name" name="name" placeholder="Ex: Hamburgueria do Dev" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="cnpj" 
                        name="cnpj" 
                        value={cnpj}
                        onChange={handleCnpjChange}
                        placeholder="00.000.000/0000-00" 
                        className="pl-9"
                        required 
                      />
                    </div>
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
                        placeholder="(11) 99999-9999" 
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo">Logotipo</Label>
                  <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer" />
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: HORÁRIOS */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
              </CardHeader>
              <CardContent>
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
                  ))}
                </div>
              </CardContent>
            </Card>

            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</>
              ) : (
                <><Check className="mr-2 h-5 w-5" /> Criar Conta e Loja</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
