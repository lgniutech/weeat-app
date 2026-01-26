"use client"

import { useActionState, useState } from "react"
import { updateStoreDesignAction } from "@/app/actions/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Palette, Image as ImageIcon, Check } from "lucide-react"

export function StoreAppearance({ store }: { store: any }) {
  const [state, action, isPending] = useActionState(updateStoreDesignAction, null)
  
  // Estado local para preview imediato da cor
  const [primaryColor, setPrimaryColor] = useState(store?.primary_color || "#ea1d2c")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aparência & Marca</h2>
        <p className="text-muted-foreground">Personalize como sua loja aparece para os clientes.</p>
      </div>

      <form action={action}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Configurações */}
          <div className="md:col-span-2 space-y-6">
            
            {/* CORES */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <CardTitle>Identidade Visual</CardTitle>
                </div>
                <CardDescription>A cor principal será usada em botões e destaques.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Principal</Label>
                    <div className="flex gap-3 items-center">
                      <Input 
                        type="color" 
                        name="primaryColor" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer" 
                      />
                      <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BANNER & BIO */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <CardTitle>Capa & Informações</CardTitle>
                </div>
                <CardDescription>Essa imagem aparece no topo do cardápio digital.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Banner da Loja</Label>
                  <Input type="file" name="banner" accept="image/*" />
                  <p className="text-xs text-muted-foreground">Recomendado: 1200x400px (JPG ou PNG)</p>
                </div>

                <div className="space-y-2">
                  <Label>Bio / Descrição Curta</Label>
                  <Textarea 
                    name="bio" 
                    placeholder="Ex: O melhor hambúrguer artesanal da região. Ingredientes frescos todos os dias!" 
                    defaultValue={store?.bio || ""}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state?.success && (
              <Alert className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-4 w-4" />
                <AlertDescription>{state.success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>

          {/* Coluna Direita: Preview Simples */}
          <div className="space-y-4">
             <div className="sticky top-4">
                <Label className="mb-2 block text-muted-foreground">Pré-visualização (Simplificada)</Label>
                
                <div className="border rounded-xl overflow-hidden shadow-lg bg-white w-full max-w-[300px] mx-auto">
                    {/* Header com Banner */}
                    <div className="h-24 w-full bg-slate-200 relative">
                        {store?.banner_url ? (
                           <img src={store.banner_url} className="w-full h-full object-cover" alt="Banner" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sem Banner</div>
                        )}
                        {/* Logo Flutuante */}
                        <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                            {store?.logo_url && <img src={store.logo_url} className="w-full h-full object-cover" />}
                        </div>
                    </div>

                    {/* Corpo */}
                    <div className="pt-8 px-4 pb-4 space-y-3">
                        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-slate-50 rounded animate-pulse" />
                        
                        {/* Botão com a cor escolhida */}
                        <div 
                          className="h-8 w-full rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm mt-4"
                          style={{ backgroundColor: primaryColor }}
                        >
                            Ver Cardápio
                        </div>
                    </div>
                </div>
             </div>
          </div>

        </div>
      </form>
    </div>
  )
}
