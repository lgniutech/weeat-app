"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStoreAction } from "@/app/actions/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Store, Globe, Clock, Camera } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Horários padrão
  const [hours] = useState([
    { day: "Segunda", open: "08:00", close: "18:00", active: true },
    { day: "Terça", open: "08:00", close: "18:00", active: true },
    { day: "Quarta", open: "08:00", close: "18:00", active: true },
    { day: "Quinta", open: "08:00", close: "18:00", active: true },
    { day: "Sexta", open: "08:00", close: "18:00", active: true },
    { day: "Sábado", open: "08:00", close: "12:00", active: true },
    { day: "Domingo", open: "00:00", close: "00:00", active: false },
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.append("businessHours", JSON.stringify(hours));

    const result = await createStoreAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Configure sua Loja</CardTitle>
            <CardDescription>
              Faltam poucos detalhes para o seu catálogo ficar online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Loja</Label>
                    <Input id="name" name="name" placeholder="Ex: Pizzaria do Dev" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">Link da Loja (URL)</Label>
                    <div className="flex items-center">
                      <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground">
                        weeat.app/
                      </span>
                      <Input 
                        id="slug" 
                        name="slug" 
                        placeholder="minha-loja" 
                        className="rounded-l-none"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo da Loja</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                        <Camera className="w-6 h-6 text-slate-400" />
                      </div>
                      <Input id="logo" name="logo" type="file" accept="image/*" className="cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* Horários Simplificados */}
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-4 font-semibold">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Horários de Funcionamento</span>
                  </div>
                  <div className="space-y-2">
                    {hours.slice(0, 5).map((d) => (
                      <div key={d.day} className="flex justify-between text-xs items-center">
                        <span className="font-medium">{d.day}</span>
                        <span className="text-muted-foreground">{d.open} - {d.close}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      * Você poderá detalhar os horários no painel depois.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando sua loja...
                  </>
                ) : (
                  "Finalizar Configuração"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
