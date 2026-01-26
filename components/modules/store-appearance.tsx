"use client"

import { useActionState, useState, useEffect } from "react"
import { updateStoreDesignAction } from "@/app/actions/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Image as ImageIcon, Check, Store, X, GripVertical, Type, Upload, Trash2 } from "lucide-react"

// Lista de Fontes
const GOOGLE_FONTS = [
  { name: "Inter", value: "Inter", type: "Sans Serif (Padrão)" },
  { name: "Roboto", value: "Roboto", type: "Sans Serif" },
  { name: "Open Sans", value: "Open Sans", type: "Sans Serif" },
  { name: "Lato", value: "Lato", type: "Sans Serif" },
  { name: "Montserrat", value: "Montserrat", type: "Sans Serif Moderno" },
  { name: "Poppins", value: "Poppins", type: "Sans Serif Geométrico" },
  { name: "Oswald", value: "Oswald", type: "Condensed (Impactante)" },
  { name: "Playfair Display", value: "Playfair Display", type: "Serif (Elegante)" },
  { name: "Merriweather", value: "Merriweather", type: "Serif (Leitura)" },
  { name: "Lora", value: "Lora", type: "Serif (Clássico)" },
  { name: "Nunito", value: "Nunito", type: "Rounded (Amigável)" },
  { name: "Quicksand", value: "Quicksand", type: "Rounded (Moderno)" },
  { name: "Pacifico", value: "Pacifico", type: "Handwriting (Destaque)" },
  { name: "Dancing Script", value: "Dancing Script", type: "Cursive (Elegante)" },
  { name: "Space Mono", value: "Space Mono", type: "Monospace (Tech)" },
]

export function StoreAppearance({ store }: { store: any }) {
  const [state, action, isPending] = useActionState(updateStoreDesignAction, null)
  
  // Estados Locais
  const [primaryColor, setPrimaryColor] = useState(store?.primary_color || "#ea1d2c")
  const [fontFamily, setFontFamily] = useState(store?.font_family || "Inter")
  
  // Estado dos Banners (Array de URLs)
  // Lógica: Se tiver array 'banners', usa ele. Se não, tenta 'banner_url' antigo. Se não, vazio.
  const getInitialBanners = () => {
    if (store?.banners && store.banners.length > 0) return store.banners
    if (store?.banner_url) return [store.banner_url]
    return []
  }

  const [banners, setBanners] = useState<string[]>(getInitialBanners())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // --- CORREÇÃO IMPORTANTE ---
  // Sincroniza o estado local quando o 'store' atualiza (após salvar)
  useEffect(() => {
    setBanners(getInitialBanners())
    setPrimaryColor(store?.primary_color || "#ea1d2c")
    setFontFamily(store?.font_family || "Inter")
  }, [store]) 

  // -- Funções de Drag & Drop --
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() 
    if (draggedIndex === null || draggedIndex === index) return
    
    const newBanners = [...banners]
    const draggedItem = newBanners[draggedIndex]
    newBanners.splice(draggedIndex, 1)
    newBanners.splice(index, 0, draggedItem)
    
    setBanners(newBanners)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const removeBanner = (index: number) => {
    setBanners(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Estilo Dinâmico para Preview */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap');
      `}</style>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editor Visual</h2>
        <p className="text-muted-foreground">Personalize cada detalhe da experiência do seu cliente.</p>
      </div>

      <form action={action}>
        {/* CAMPOS OCULTOS: Enviam os dados para o servidor */}
        <input type="hidden" name="keptBanners" value={JSON.stringify(banners)} />
        <input type="hidden" name="primaryColor" value={primaryColor} />
        <input type="hidden" name="fontFamily" value={fontFamily} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: Controles */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. IDENTIDADE DA MARCA */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <CardTitle>Identidade da Marca</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-4 flex-1">
                        <div className="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 relative group shadow-sm hover:border-primary transition-colors">
                            {store?.logo_url ? (
                                <img src={store.logo_url} className="w-full h-full object-cover" alt="Logo" />
                            ) : (
                                <span className="text-xs text-muted-foreground font-medium">Sem Logo</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <Input type="file" name="logo" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                            <Label>Logo da Loja</Label>
                            <p className="text-xs text-muted-foreground">Clique na imagem para enviar seu logo.</p>
                        </div>
                    </div>

                    {/* Cor */}
                    <div className="space-y-2 flex-1">
                        <Label>Cor Principal</Label>
                        <div className="flex gap-3 items-center">
                            <div className="relative overflow-hidden w-full h-10 rounded-md border shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <input 
                                    type="color" 
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0" 
                                />
                            </div>
                            <div className="text-xs font-mono text-muted-foreground w-20 px-2 py-1 bg-slate-100 rounded text-center">
                                {primaryColor}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fonte */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Type className="w-4 h-4" /> Tipografia
                    </Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Escolha uma fonte" />
                        </SelectTrigger>
                        <SelectContent>
                            {GOOGLE_FONTS.map((font) => (
                                <SelectItem key={font.value} value={font.value}>
                                    <span style={{ fontFamily: font.value }} className="text-base">{font.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({font.type})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

              </CardContent>
            </Card>

            {/* 2. CARROSSEL (Drag & Drop) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <CardTitle>Carrossel de Destaques</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">{banners.length} fotos</span>
                </div>
                <CardDescription>
                    Gerencie as fotos do topo da loja. A primeira foto é a capa principal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Lista Visual de Banners (Arrastáveis) */}
                {banners.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 select-none p-4 bg-slate-50/50 rounded-xl border border-dashed">
                        {banners.map((url, index) => (
                            <div 
                                key={url} 
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`
                                    relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-move group transition-all duration-200
                                    ${draggedIndex === index ? 'opacity-40 border-primary border-dashed scale-95' : 'border-white shadow-md hover:border-slate-300 hover:shadow-lg'}
                                `}
                            >
                                <img src={url} className="w-full h-full object-cover bg-slate-200" alt={`Banner ${index}`} />
                                
                                {/* Botão de Excluir */}
                                <button 
                                    type="button"
                                    onClick={() => removeBanner(index)}
                                    className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm"
                                    title="Remover foto"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Indicador de Ordem */}
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10 shadow-sm">
                                    {index === 0 ? 'Capa Principal' : `${index + 1}º`}
                                </div>
                                
                                {/* Overlay de Hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>Nenhuma foto no carrossel.</p>
                        <p className="text-xs">Adicione fotos abaixo para começar.</p>
                    </div>
                )}

                {/* Área de Upload */}
                <div className="space-y-3 pt-2">
                    <Label className="text-base">Adicionar Novas Fotos</Label>
                    <div className="flex flex-col gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50/30">
                        <Input 
                            type="file" 
                            name="newBanners" 
                            accept="image/*" 
                            multiple 
                            className="bg-white"
                        />
                        <div className="flex gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Suporta Múltiplos Arquivos</span>
                            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Formato Vertical (9:16) Recomendado</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Dica: Primeiro faça o upload e clique em "Salvar". Depois que a página recarregar, você poderá arrastar as fotos para organizar a ordem.
                    </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Bio / Descrição</Label>
                  <Textarea 
                    name="bio" 
                    defaultValue={store?.bio || ""}
                    placeholder="Conte um pouco sobre sua loja..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Feedback & Submit */}
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

            <Button type="submit" disabled={isPending} className="w-full h-12 px-8 text-base font-medium shadow-lg shadow-primary/20">
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
              Salvar Alterações
            </Button>
          </div>

          {/* COLUNA DIREITA: Preview */}
          <div className="space-y-4">
             <div className="sticky top-4">
                <Label className="mb-3 block text-muted-foreground text-center font-medium">Como o cliente vê:</Label>
                
                {/* Mockup */}
                <div 
                    className="border-[8px] border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white w-[300px] mx-auto h-[620px] flex flex-col relative ring-1 ring-slate-900/50"
                    style={{ fontFamily: fontFamily }} 
                >
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-slate-900 rounded-b-xl z-30"></div>

                    {/* Header estilo "Stories" */}
                    <div className="h-[350px] bg-slate-200 relative shrink-0">
                        {/* Imagem (Pega a primeira da lista ou a nova que será a primeira) */}
                        {banners.length > 0 ? (
                           <img src={banners[0]} className="w-full h-full object-cover" alt="Preview Capa" />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                <ImageIcon className="w-12 h-12 opacity-20 mb-2" />
                                <span className="text-xs font-medium">Sem Imagens</span>
                           </div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                        {/* Infos da Loja */}
                        <div className="absolute bottom-6 left-5 right-5 z-20 flex items-end gap-3">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm shrink-0">
                                {store?.logo_url && <img src={store.logo_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="text-white pb-1">
                                <div className="text-xl font-bold leading-tight drop-shadow-sm">{store?.name || "Nome da Loja"}</div>
                                <div className="text-[10px] opacity-90 line-clamp-2 mt-1 font-light leading-snug">
                                    {store?.bio || "A melhor comida da região."}
                                </div>
                            </div>
                        </div>

                        {/* Indicadores */}
                        <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-1.5 opacity-80">
                            {banners.length > 0 ? banners.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full shadow-sm transition-all ${i === 0 ? 'w-4 bg-white' : 'w-1 bg-white/60'}`} />
                            )) : (
                                <div className="w-4 h-1 bg-white/50 rounded-full" />
                            )}
                        </div>
                    </div>

                    {/* Corpo do App Mockup */}
                    <div className="flex-1 p-4 space-y-4 bg-white overflow-hidden relative">
                        {/* Barra de Busca Fake */}
                        <div className="h-10 bg-slate-100 rounded-full w-full mb-1 flex items-center px-4 gap-2 opacity-50">
                             <div className="w-4 h-4 rounded-full bg-slate-300" />
                             <div className="h-2 w-20 rounded-full bg-slate-200" />
                        </div>
                        
                        {/* Filtros */}
                        <div className="flex gap-2 overflow-hidden opacity-50">
                            <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0 border border-slate-200" />
                            <div className="h-7 w-24 bg-slate-100 rounded-full shrink-0 border border-slate-200" />
                        </div>

                        {/* Lista de Produtos */}
                        <div className="space-y-3 pt-2">
                            {[1].map(i => (
                                <div key={i} className="flex gap-3 border rounded-xl p-2.5 shadow-sm">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-slate-800/10 rounded" />
                                        <div className="h-3 w-full bg-slate-50 rounded" />
                                        <div className="font-bold text-sm mt-1 text-slate-800">R$ 29,90</div>
                                    </div>
                                    <div className="w-20 h-20 bg-slate-100 rounded-lg" />
                                </div>
                            ))}
                        </div>
                        
                        {/* Botão Flutuante (Simulação) */}
                        <div className="absolute bottom-6 left-4 right-4">
                            <div 
                                className="h-14 w-full rounded-full flex items-center justify-between px-6 text-white text-xs font-bold shadow-lg ring-1 ring-black/5"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <div className="flex gap-2 items-center">
                                    <span className="bg-white/20 px-2 py-0.5 rounded">1</span>
                                    <span>Ver Sacola</span>
                                </div>
                                <span>R$ 29,90</span>
                            </div>
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
