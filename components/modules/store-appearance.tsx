"use client"

import { useActionState, useState } from "react"
import { updateStoreDesignAction } from "@/app/actions/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Image as ImageIcon, Check, Store, X, GripVertical, Type, Upload } from "lucide-react"

// Lista de 15 Fontes Populares do Google Fonts
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
  
  // Estado dos Banners (Array de URLs para o Drag & Drop)
  const initialBanners = (store?.banners && store.banners.length > 0) 
    ? store.banners 
    : (store?.banner_url ? [store.banner_url] : [])
  
  const [banners, setBanners] = useState<string[]>(initialBanners)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // -- Funções de Drag & Drop --
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() // Necessário para permitir o drop
    if (draggedIndex === null || draggedIndex === index) return
    
    // Reordena o array visualmente em tempo real
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
      
      {/* Importação Dinâmica da Fonte para Preview no Admin */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap');
      `}</style>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editor Visual</h2>
        <p className="text-muted-foreground">Personalize cada detalhe da experiência do seu cliente.</p>
      </div>

      <form action={action}>
        {/* CAMPOS OCULTOS: Enviam os estados React para o Server Action */}
        <input type="hidden" name="keptBanners" value={JSON.stringify(banners)} />
        <input type="hidden" name="primaryColor" value={primaryColor} />
        <input type="hidden" name="fontFamily" value={fontFamily} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: Controles */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. IDENTIDADE VISUAL (Logo, Cor, Fonte) */}
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
                        <div className="shrink-0 w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                            {store?.logo_url ? (
                                <img src={store.logo_url} className="w-full h-full object-cover" alt="Logo" />
                            ) : (
                                <span className="text-xs text-muted-foreground">Logo</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <Input type="file" name="logo" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                            <Label>Logo da Loja</Label>
                            <p className="text-xs text-muted-foreground">Clique na imagem para alterar.</p>
                        </div>
                    </div>

                    {/* Cor */}
                    <div className="space-y-2 flex-1">
                        <Label>Cor Principal</Label>
                        <div className="flex gap-3 items-center">
                            <div className="relative overflow-hidden w-full h-10 rounded-md border shadow-sm">
                                <input 
                                    type="color" 
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="absolute -top-2 -left-2 w-[120%] h-[120%] cursor-pointer p-0 border-0" 
                                />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-16">{primaryColor}</span>
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
                                    <span style={{ fontFamily: font.value }}>{font.name}</span>
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
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <CardTitle>Carrossel de Destaques</CardTitle>
                </div>
                <CardDescription>Arraste as fotos para mudar a ordem. A primeira imagem será a capa principal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Lista de Banners Atuais (Arrastáveis) */}
                {banners.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 select-none">
                        {banners.map((url, index) => (
                            <div 
                                key={url} 
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`
                                    relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-move group transition-all
                                    ${draggedIndex === index ? 'opacity-50 border-primary border-dashed scale-95' : 'border-transparent shadow-sm hover:border-slate-300'}
                                `}
                            >
                                <img src={url} className="w-full h-full object-cover" alt="Banner" />
                                
                                {/* Botão de Excluir */}
                                <button 
                                    type="button"
                                    onClick={() => removeBanner(index)}
                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                    <X className="w-3 h-3" />
                                </button>

                                {/* Indicador de "Arrastar" */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                                    <GripVertical className="text-white w-8 h-8 opacity-80" />
                                </div>
                                
                                <div className="absolute bottom-1 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm z-10">
                                    {index + 1}º
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload de Novos */}
                <div className="space-y-2 border-t pt-4">
                    <Label>Adicionar Novas Fotos</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="file" 
                            name="newBanners" 
                            accept="image/*" 
                            multiple 
                            className="file:bg-secondary file:text-secondary-foreground file:border-0 file:rounded-md file:mr-4 file:px-2 file:text-xs"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">As novas fotos serão adicionadas ao final da lista.</p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label>Bio / Descrição</Label>
                  <Textarea 
                    name="bio" 
                    defaultValue={store?.bio || ""}
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

            <Button type="submit" disabled={isPending} className="w-full md:w-auto h-12 px-8 text-base font-medium">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>

          {/* COLUNA DIREITA: Preview em Tempo Real */}
          <div className="space-y-4">
             <div className="sticky top-4">
                <Label className="mb-3 block text-muted-foreground text-center">Pré-visualização do Cliente</Label>
                
                {/* Mockup de Celular */}
                <div 
                    className="border-[6px] border-slate-900 rounded-[2rem] overflow-hidden shadow-2xl bg-white w-[300px] mx-auto h-[600px] flex flex-col relative"
                    style={{ fontFamily: fontFamily }} // APLICA A FONTE SELECIONADA AQUI
                >
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-30"></div>

                    {/* Header estilo "Stories" */}
                    <div className="h-3/5 bg-slate-200 relative">
                        {/* Imagem (Pega a primeira da lista) */}
                        {banners.length > 0 ? (
                           <img src={banners[0]} className="w-full h-full object-cover" alt="Preview Capa" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sem Capa</div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Infos da Loja */}
                        <div className="absolute bottom-6 left-5 right-5 z-20 flex items-end gap-3">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm shrink-0">
                                {store?.logo_url && <img src={store.logo_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="text-white pb-1">
                                <div className="text-xl font-bold leading-tight drop-shadow-sm">{store?.name || "Sua Loja"}</div>
                                <div className="text-[10px] opacity-90 line-clamp-2 mt-0.5 font-light">
                                    {store?.bio || "A melhor comida da região."}
                                </div>
                            </div>
                        </div>

                        {/* Indicadores de Carrossel */}
                        <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1">
                            {banners.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full ${i === 0 ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Corpo do App Mockup */}
                    <div className="flex-1 p-4 space-y-4 bg-white overflow-hidden relative">
                        {/* Barra de Busca Fake */}
                        <div className="h-10 bg-slate-100 rounded-full w-full mb-2" />
                        
                        {/* Filtros */}
                        <div className="flex gap-2 overflow-hidden">
                            <div className="h-8 w-20 bg-slate-100 rounded-full shrink-0" />
                            <div className="h-8 w-20 bg-slate-100 rounded-full shrink-0" />
                        </div>

                        {/* Lista de Produtos */}
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="flex gap-3 border rounded-xl p-2">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-slate-100 rounded" />
                                        <div className="h-3 w-1/2 bg-slate-50 rounded" />
                                        <div className="font-bold text-sm mt-1">R$ 29,90</div>
                                    </div>
                                    <div className="w-20 h-20 bg-slate-100 rounded-lg" />
                                </div>
                            ))}
                        </div>
                        
                        {/* Botão Flutuante (Simulação) */}
                        <div className="absolute bottom-4 left-4 right-4">
                            <div 
                                className="h-12 w-full rounded-full flex items-center justify-between px-6 text-white text-xs font-bold shadow-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <span>1 item</span>
                                <span>Ver Sacola</span>
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
