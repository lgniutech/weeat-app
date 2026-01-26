"use client"

import { useActionState, useState } from "react"
import { updateStoreDesignAction } from "@/app/actions/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Image as ImageIcon, Check, Store } from "lucide-react"

export function StoreAppearance({ store }: { store: any }) {
  const [state, action, isPending] = useActionState(updateStoreDesignAction, null)
  
  const [primaryColor, setPrimaryColor] = useState(store?.primary_color || "#ea1d2c")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aparência & Marca</h2>
        <p className="text-muted-foreground">Personalize as cores, logos e banners da sua loja.</p>
      </div>

      <form action={action}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Configurações */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. LOGO & COR */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <CardTitle>Identidade da Marca</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                    <div className="shrink-0">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                            {store?.logo_url ? (
                                <img src={store.logo_url} className="w-full h-full object-cover" alt="Logo atual" />
                            ) : (
                                <span className="text-xs text-muted-foreground">Sem Logo</span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2 flex-1">
                        <Label>Logo da Loja</Label>
                        <Input type="file" name="logo" accept="image/*" />
                        <p className="text-xs text-muted-foreground">Aparecerá no ícone do cardápio.</p>
                    </div>
                </div>

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
                    <p className="text-xs text-muted-foreground">Usada em botões e destaques.</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. CARROSSEL & BIO */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <CardTitle>Carrossel & Capa</CardTitle>
                </div>
                <CardDescription>Imagens rotativas que aparecem no topo do cardápio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Imagens do Carrossel (Selecione várias)</Label>
                  <Input 
                    type="file" 
                    name="banners" 
                    accept="image/*" 
                    multiple 
                  />
                  <p className="text-xs text-muted-foreground">Recomendado: Formato vertical (9:16) ou quadrado. Selecione todas as fotos de uma vez para atualizar o carrossel.</p>
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

            <Button type="submit" disabled={isPending} className="w-full md:w-auto">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>

          {/* Coluna Direita: Preview Mobile */}
          <div className="space-y-4">
             <div className="sticky top-4">
                <Label className="mb-2 block text-muted-foreground">Preview Mobile</Label>
                
                <div className="border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl bg-white w-[280px] mx-auto h-[500px] flex flex-col relative">
                    {/* Header estilo "Stories" */}
                    <div className="h-3/5 bg-slate-200 relative">
                        {/* Imagem de Fundo (Banner) */}
                        {store?.banner_url ? (
                           <img src={store.banner_url} className="w-full h-full object-cover opacity-90" alt="Banner" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sem Imagens</div>
                        )}
                        
                        {/* Overlay Gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                        {/* Logo Sobreposto */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm">
                                {store?.logo_url && <img src={store.logo_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="text-white">
                                <div className="text-sm font-bold drop-shadow-md">{store?.name || "Nome da Loja"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Corpo */}
                    <div className="flex-1 p-4 space-y-3 bg-white">
                        <div 
                          className="h-8 w-full rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                            Ver Cardápio
                        </div>
                        <div className="h-2 w-3/4 bg-slate-100 rounded" />
                        <div className="h-2 w-1/2 bg-slate-100 rounded" />
                        <div className="h-20 w-full bg-slate-50 rounded-lg border border-slate-100 mt-4" />
                    </div>
                </div>
             </div>
          </div>

        </div>
      </form>
    </div>
  )
}
