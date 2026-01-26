"use client"

import { useState, useEffect } from "react"
import { updateStoreDesignAction } from "@/app/actions/store"
import { createClient } from "@/lib/supabase/client" // Usaremos o cliente navegador
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Image as ImageIcon, Check, Store, Upload, Trash2, Plus, GripVertical, Type } from "lucide-react"
import { toast } from "sonner" // Opcional, para feedback visual

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

type BannerItem = {
  id: string
  url: string
  isNew: boolean
  file?: File
}

export function StoreAppearance({ store }: { store: any }) {
  // Estados do Formulário
  const [storeName, setStoreName] = useState(store?.name || "")
  const [bio, setBio] = useState(store?.bio || "")
  const [primaryColor, setPrimaryColor] = useState(store?.primary_color || "#ea1d2c")
  const [fontFamily, setFontFamily] = useState(store?.font_family || "Inter")
  
  // Imagens
  const [logoPreview, setLogoPreview] = useState<string | null>(store?.logo_url || null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  // Banners
  const getInitialItems = (): BannerItem[] => {
    const existing = (store?.banners && store.banners.length > 0) 
      ? store.banners 
      : (store?.banner_url ? [store.banner_url] : [])
    return existing.map((url: string) => ({ id: url, url, isNew: false }))
  }
  const [items, setItems] = useState<BannerItem[]>(getInitialItems())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Estados de Controle
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Atualiza estados se a prop store mudar
  useEffect(() => {
    setStoreName(store?.name || "")
    setBio(store?.bio || "")
    setPrimaryColor(store?.primary_color || "#ea1d2c")
    setFontFamily(store?.font_family || "Inter")
    setLogoPreview(store?.logo_url || null)
    setItems(getInitialItems())
  }, [store])

  // --- FUNÇÃO DE UPLOAD CLIENT-SIDE ---
  const uploadToSupabase = async (file: File, pathPrefix: string) => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${pathPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file, { upsert: true })

    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName)
      
    return publicUrl
  }

  // --- HANDLER DE SALVAR ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
        // 1. Upload do Logo (se mudou)
        let finalLogoUrl = logoPreview
        if (logoFile) {
            finalLogoUrl = await uploadToSupabase(logoFile, `logo-${store.owner_id}`)
        }

        // 2. Upload dos Banners (apenas os novos)
        const finalBanners: string[] = []
        for (const item of items) {
            if (item.isNew && item.file) {
                const url = await uploadToSupabase(item.file, `banner-${store.owner_id}`)
                finalBanners.push(url)
            } else {
                finalBanners.push(item.url)
            }
        }

        // 3. Montar FormData com os links prontos (não enviamos mais arquivos brutos)
        const formData = new FormData()
        formData.append("name", storeName)
        formData.append("bio", bio)
        formData.append("primaryColor", primaryColor)
        formData.append("fontFamily", fontFamily)
        
        // Enviamos apenas as URLs finais
        if (finalLogoUrl) formData.append("logoUrl", finalLogoUrl)
        formData.append("bannersJson", JSON.stringify(finalBanners))

        // 4. Chamar Server Action
        const result = await updateStoreDesignAction(null, formData)

        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: "Loja atualizada com sucesso!" })
            // Limpa o arquivo de logo local pois já foi salvo
            setLogoFile(null)
            // Atualiza os items para não serem mais marcados como "new"
            setItems(finalBanners.map(url => ({ id: url, url, isNew: false })))
        }

    } catch (error: any) {
        console.error("Erro ao salvar:", error)
        setMessage({ type: 'error', text: "Erro no upload. Tente imagens menores ou verifique sua conexão." })
    } finally {
        setIsSaving(false)
    }
  }

  // --- HANDLERS DE INTERFACE ---
  const handleLogoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files)
        const newItems: BannerItem[] = newFiles.map(file => ({
            id: Math.random().toString(36),
            url: URL.createObjectURL(file),
            isNew: true,
            file: file
        }))
        setItems(prev => [...prev, ...newItems])
    }
  }

  const removeBanner = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))

  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() 
    if (draggedIndex === null || draggedIndex === index) return
    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    setItems(newItems)
    setDraggedIndex(index)
  }
  const handleDragEnd = () => setDraggedIndex(null)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap');
      `}</style>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editor Visual</h2>
        <p className="text-muted-foreground">Personalize cada detalhe da experiência do seu cliente.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- COLUNA ESQUERDA: Controles --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. MARCA & IDENTIDADE */}
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
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 relative group shadow-sm hover:border-primary transition-colors">
                            {logoPreview ? (
                                <img src={logoPreview} className="w-full h-full object-cover" alt="Logo Preview" />
                            ) : (
                                <span className="text-xs text-muted-foreground font-medium">Sem Logo</span>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none z-10">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            
                            <Input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleLogoSelected}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
                            />
                        </div>
                    </div>

                    {/* Nome e Cor */}
                    <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                            <Label>Nome de Exibição</Label>
                            <Input 
                                value={storeName} 
                                onChange={(e) => setStoreName(e.target.value)} 
                                placeholder="Nome do seu restaurante"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cor Principal</Label>
                            <div className="flex gap-3 items-center">
                                <div className="relative overflow-hidden w-full h-10 rounded-md border shadow-sm">
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
                </div>

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
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </CardContent>
            </Card>

            {/* 2. CARROSSEL & BIO */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <CardTitle>Carrossel & Informações</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">{items.length} fotos</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* GRID VISUAL */}
                {items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 select-none p-4 bg-slate-50/50 rounded-xl border border-dashed">
                        {items.map((item, index) => (
                            <div 
                                key={item.id} 
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`
                                    relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-move group transition-all duration-200
                                    ${draggedIndex === index ? 'opacity-40 border-primary border-dashed scale-95' : 'border-white shadow-md hover:border-slate-300 hover:shadow-lg'}
                                `}
                            >
                                <img src={item.url} className="w-full h-full object-cover bg-slate-200" alt="Banner" />
                                <button 
                                    type="button"
                                    onClick={() => removeBanner(index)}
                                    className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {item.isNew && (
                                    <div className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">NOVO</div>
                                )}
                            </div>
                        ))}
                        <label className="aspect-[9/16] rounded-lg border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors text-muted-foreground hover:text-primary">
                            <Plus className="w-8 h-8" />
                            <span className="text-xs font-bold">Adicionar</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
                        </label>
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground flex flex-col items-center justify-center gap-4">
                        <ImageIcon className="w-12 h-12 opacity-20" />
                        <label className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Selecionar Fotos
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
                        </label>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label>Bio / Descrição Curta</Label>
                  <Textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre sua loja..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* MENSAGENS E BOTÃO */}
            {message && (
              <Alert variant={message.type === 'error' ? "destructive" : "default"} className={message.type === 'success' ? "bg-green-50 text-green-700 border-green-200" : ""}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSaving} className="w-full h-12 px-8 text-base font-medium shadow-lg shadow-primary/20">
              {isSaving ? (
                 <>
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                   Enviando imagens...
                 </>
              ) : (
                 <>
                   <Check className="mr-2 h-5 w-5" />
                   Salvar Alterações
                 </>
              )}
            </Button>
          </div>

          {/* --- COLUNA DIREITA: Preview --- */}
          <div className="space-y-4">
             <div className="sticky top-4">
                <Label className="mb-3 block text-muted-foreground text-center font-medium">Pré-visualização do Cliente</Label>
                
                <div 
                    className="border-[8px] border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white w-[300px] mx-auto h-[620px] flex flex-col relative ring-1 ring-slate-900/50"
                    style={{ fontFamily: fontFamily }} 
                >
                    {/* Header */}
                    <div className="h-[350px] bg-slate-200 relative shrink-0">
                        {items.length > 0 ? (
                           <img src={items[0].url} className="w-full h-full object-cover" alt="Preview Capa" />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                <ImageIcon className="w-12 h-12 opacity-20 mb-2" />
                           </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                        <div className="absolute bottom-6 left-5 right-5 z-20 flex items-end gap-3">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm shrink-0">
                                {logoPreview ? (
                                    <img src={logoPreview} className="w-full h-full object-cover" alt="Logo Preview" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
                                        {storeName?.substring(0,2).toUpperCase() || "LJ"}
                                    </div>
                                )}
                            </div>
                            <div className="text-white pb-1">
                                <div className="text-xl font-bold leading-tight drop-shadow-sm">
                                    {storeName || "Nome da Loja"}
                                </div>
                                <div className="text-[10px] opacity-90 line-clamp-2 mt-1 font-light leading-snug">
                                    {bio || "A melhor comida da região."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Corpo Mockup */}
                    <div className="flex-1 p-4 bg-white relative">
                        <div className="space-y-3 pt-2">
                             <div className="h-4 w-1/2 bg-slate-100 rounded" />
                             <div className="h-20 w-full bg-slate-50 rounded-xl" />
                             <div className="h-20 w-full bg-slate-50 rounded-xl" />
                        </div>
                        <div className="absolute bottom-6 left-4 right-4">
                            <div 
                                className="h-14 w-full rounded-full flex items-center justify-between px-6 text-white text-xs font-bold shadow-lg ring-1 ring-black/5"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <span>Ver Sacola</span>
                                <span>R$ 0,00</span>
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
