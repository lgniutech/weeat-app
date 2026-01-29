"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useActionState } from "react"
import { 
    createCategoryAction, 
    deleteCategoryAction, 
    createProductAction, 
    updateProductAction, 
    deleteProductAction, 
    toggleProductAvailabilityAction, 
    getStoreIngredientsAction, 
    createIngredientAction,
    getStoreAddonsAction,
    createAddonAction,
    updateCategoryOrderAction
} from "@/app/actions/menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, UtensilsCrossed, Image as ImageIcon, Loader2, X, Pencil, Search, GripVertical, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// --- SELETOR DE INGREDIENTES (CONTROLADO) ---
function IngredientSelector({ storeId, value = [], onChange }: { storeId: string, value: string[], onChange: (ids: string[]) => void }) {
    const [input, setInput] = useState("")
    const [allIngredients, setAllIngredients] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Busca apenas uma vez ao montar
    useEffect(() => { getStoreIngredientsAction(storeId).then(setAllIngredients) }, [storeId])

    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const addIngredient = async () => {
        if (!input.trim()) return
        const name = input.trim()
        const existing = allIngredients.find(i => normalize(i.name) === normalize(name))
        
        if (existing) {
            if (!value.includes(existing.id)) onChange([...value, existing.id])
            setInput("")
        } else {
            setLoading(true)
            try {
                const newIng = await createIngredientAction(storeId, name)
                if (newIng) {
                    setAllIngredients(prev => [...prev, newIng].sort((a,b) => a.name.localeCompare(b.name)))
                    onChange([...value, newIng.id])
                    setInput("")
                }
            } finally { setLoading(false) }
        }
    }

    const toggleSelection = (id: string) => {
        value.includes(id) ? onChange(value.filter(sid => sid !== id)) : onChange([...value, id])
    }

    const filtered = allIngredients.filter(i => !value.includes(i.id) && (input === "" || normalize(i.name).includes(normalize(input))))

    return (
        <div className="space-y-3">
            <Label className="text-sm font-semibold">Ingredientes (Composição)</Label>
            <div className="flex gap-2 w-full">
                <Input 
                    placeholder="Digite o ingrediente..." 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())} 
                    disabled={loading} 
                />
                <Button type="button" onClick={addIngredient} disabled={loading || !input.trim()} variant="secondary">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border min-h-[50px]">
                {value.length === 0 && <span className="text-sm text-muted-foreground w-full text-center self-center">Nenhum ingrediente.</span>}
                {allIngredients.filter(i => value.includes(i.id)).map(ing => (
                    <Badge key={ing.id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 border-primary/20 bg-white">
                        {ing.name}
                        <button type="button" onClick={() => toggleSelection(ing.id)} className="hover:bg-red-100 rounded-full p-0.5 text-slate-400 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                    </Badge>
                ))}
            </div>
            {filtered.length > 0 && (
                <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase">Sugestões</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                        {filtered.map(ing => (
                            <Badge key={ing.id} variant="outline" className="cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all" onClick={() => toggleSelection(ing.id)}>
                                <Plus className="h-3 w-3 mr-1 opacity-50" />{ing.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// --- SELETOR DE ACRÉSCIMOS (CONTROLADO) ---
function AddonSelector({ storeId, value = [], onChange }: { storeId: string, value: {id: string, price: number}[], onChange: (addons: any[]) => void }) {
    const [nameInput, setNameInput] = useState("")
    const [allAddons, setAllAddons] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Busca apenas uma vez ao montar
    useEffect(() => { getStoreAddonsAction(storeId).then(setAllAddons) }, [storeId])

    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const handleCreateOrAdd = async () => {
        if (!nameInput.trim()) return
        const name = nameInput.trim()
        const existing = allAddons.find(i => normalize(i.name) === normalize(name))
        
        if (existing) {
            addAddonToProduct(existing.id)
        } else {
            setLoading(true)
            try {
                const newAddon = await createAddonAction(storeId, name)
                if (newAddon) {
                    setAllAddons(prev => [...prev, newAddon].sort((a,b) => a.name.localeCompare(b.name)))
                    addAddonToProduct(newAddon.id)
                }
            } finally { setLoading(false) }
        }
        setNameInput("")
    }

    const addAddonToProduct = (id: string) => {
        if (value.find(s => s.id === id)) return
        onChange([...value, { id, price: 0 }])
    }

    const removeAddon = (id: string) => {
        onChange(value.filter(s => s.id !== id))
    }

    const updatePrice = (id: string, newPrice: string) => {
        const price = parseFloat(newPrice.replace(",", "."))
        if (isNaN(price)) return
        onChange(value.map(item => item.id === id ? { ...item, price } : item))
    }

    const filteredLibrary = allAddons.filter(i => !value.find(s => s.id === i.id) && (nameInput === "" || normalize(i.name).includes(normalize(nameInput))))

    return (
        <div className="space-y-4">
            <Label className="text-sm font-semibold">Adicionais (Opcionais Pagos)</Label>
            <div className="flex gap-2 w-full">
                <Input 
                    placeholder="Nome do adicional (Ex: Bacon)" 
                    value={nameInput} 
                    onChange={e => setNameInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateOrAdd())}
                    disabled={loading}
                />
                <Button type="button" onClick={handleCreateOrAdd} disabled={loading || !nameInput.trim()} variant="secondary">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>
            <div className="space-y-2">
                {value.length > 0 && <span className="text-xs font-semibold text-muted-foreground uppercase">Ativos neste produto</span>}
                <div className="grid gap-2">
                    {value.map(item => {
                        const addonData = allAddons.find(a => a.id === item.id)
                        if (!addonData) return null
                        return (
                            <div key={item.id} className="flex items-center gap-2 bg-yellow-50/50 border border-yellow-100 p-2 rounded-md animate-in slide-in-from-left-2">
                                <span className="flex-1 font-medium text-sm text-yellow-900">{addonData.name}</span>
                                <div className="flex items-center gap-1 bg-white border rounded px-2 h-8 w-28">
                                    <span className="text-xs text-muted-foreground">R$</span>
                                    <input 
                                        type="number" step="0.50" min="0"
                                        className="w-full text-sm outline-none bg-transparent"
                                        value={item.price}
                                        onChange={e => updatePrice(item.id, e.target.value)}
                                    />
                                </div>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeAddon(item.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>
            {filteredLibrary.length > 0 && (
                <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase">Biblioteca</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                        {filteredLibrary.map(addon => (
                            <Badge key={addon.id} variant="outline" className="cursor-pointer hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700 transition-all" onClick={() => addAddonToProduct(addon.id)}>
                                <Plus className="h-3 w-3 mr-1 opacity-50" />{addon.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ImageUploadPreview({ initialImage, name }: { initialImage?: string, name: string }) {
    const [preview, setPreview] = useState<string | null>(initialImage || null)
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setPreview(URL.createObjectURL(file))
    }
    return (
        <div className="space-y-2">
            <Label>Foto do Prato</Label>
            <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
                </div>
                <div className="flex-1">
                    <Input type="file" name={name} accept="image/*" onChange={handleFileChange} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    <p className="text-xs text-muted-foreground mt-1">Recomendado: 800x800px (JPG, PNG)</p>
                </div>
            </div>
        </div>
    )
}

// --- FORMULÁRIOS DE PRODUTO (MODAL OTIMIZADO) ---

function ProductForm({ storeId, categories, product }: { storeId: string, categories: any[], product?: any }) {
    const isEdit = !!product
    const [state, action, isPending] = useActionState(isEdit ? updateProductAction : createProductAction, null)
    
    // Estado controlado do Dialog
    const [isOpen, setIsOpen] = useState(false)
    
    // Estado do Formulário
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
    const [selectedAddons, setSelectedAddons] = useState<any[]>([])

    // Fecha o modal em caso de sucesso
    useEffect(() => { if (state?.success) setIsOpen(false) }, [state])

    // LÓGICA DE RESET INTELIGENTE:
    // Em vez de usar useEffect para monitorar isOpen (que causava o loop),
    // usamos o evento de alteração do Dialog para resetar o estado uma única vez.
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (open) {
            // Se abriu, carrega ou limpa os dados
            if (product) {
                setSelectedIngredients(product.ingredients?.map((i: any) => i.id) || [])
                setSelectedAddons(product.addons?.map((a: any) => ({ id: a.id, price: a.price })) || [])
            } else {
                setSelectedIngredients([])
                setSelectedAddons([])
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                ) : (
                    <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
                )}
            </DialogTrigger>
            {/* Correção de Acessibilidade e Loop Resolvido */}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
                    <DialogDescription className="sr-only">Preencha os detalhes do produto abaixo.</DialogDescription>
                </DialogHeader>
                <form action={action} className="space-y-6">
                    <input type="hidden" name="storeId" value={storeId} />
                    {isEdit && <input type="hidden" name="productId" value={product.id} />}
                    <input type="hidden" name="ingredients" value={JSON.stringify(selectedIngredients)} />
                    <input type="hidden" name="addons" value={JSON.stringify(selectedAddons)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select name="categoryId" defaultValue={product?.category_id} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label>Preço (R$)</Label>
                            <Input name="price" defaultValue={product?.price} placeholder="0,00" required />
                         </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nome do Produto</Label>
                        <Input name="name" defaultValue={product?.name} placeholder="Ex: X-Bacon Supremo" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea name="description" defaultValue={product?.description || ""} placeholder="Uma breve descrição..." rows={2} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-4 bg-slate-50/50 rounded-lg border">
                            <IngredientSelector storeId={storeId} value={selectedIngredients} onChange={setSelectedIngredients} />
                        </div>
                        <div className="p-4 bg-yellow-50/30 rounded-lg border border-yellow-100/50">
                            <AddonSelector storeId={storeId} value={selectedAddons} onChange={setSelectedAddons} />
                        </div>
                    </div>

                    <ImageUploadPreview name="image" initialImage={product?.image_url} />

                    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : (isEdit ? "Salvar Alterações" : "Criar Produto")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- GESTÃO DE CATEGORIAS ---

function AddCategoryForm({ storeId }: { storeId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, action, isPending] = useActionState(createCategoryAction, null)
  useEffect(() => { if (state?.success) setIsOpen(false) }, [state])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"><Plus className="mr-2 h-4 w-4" /> Nova Categoria</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova seção para organizar seus produtos.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4 py-2">
            <input type="hidden" name="storeId" value={storeId} />
            <div className="space-y-2"><Label htmlFor="category-name">Nome da Categoria</Label><Input id="category-name" name="name" placeholder="Digite o nome..." required /></div>
            {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            <Button type="submit" disabled={isPending} className="w-full">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Categoria"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteCategoryAction.bind(null, id), null)
    return (<form action={action}><Button variant="ghost" size="icon" type="submit" disabled={isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></form>)
}

function DeleteProductBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteProductAction.bind(null, id), null)
    return (<form action={action}><Button variant="ghost" size="icon" type="submit" disabled={isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></form>)
}

function ProductToggle({ id, isAvailable }: { id: string, isAvailable: boolean }) {
    return (<Switch checked={isAvailable} onCheckedChange={(checked) => toggleProductAvailabilityAction(id, checked)} />)
}

// --- COMPONENTE PRINCIPAL ---

export function MenuManager({ store, categories }: { store: any, categories: any[] }) {
  const [productSearch, setProductSearch] = useState("")
  // Correção: [...categories] cria uma cópia para não mutar a prop original com .sort
  const [localCategories, setLocalCategories] = useState([...categories].sort((a,b) => (a.index || 0) - (b.index || 0)))
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [hasOrderChanged, setHasOrderChanged] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Atualiza local se server mudar (e não estiver arrastando)
  useEffect(() => { 
      if(!draggedItem) setLocalCategories([...categories].sort((a,b) => (a.index || 0) - (b.index || 0))) 
  }, [categories, draggedItem])

  const handleDragStart = (e: React.DragEvent, item: any) => {
      setDraggedItem(item)
      e.dataTransfer.effectAllowed = "move"
      const ghost = document.createElement('div'); ghost.style.opacity = '0'; document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0); setTimeout(() => document.body.removeChild(ghost), 0);
  }

  const handleDragOver = (e: React.DragEvent, targetItem: any) => {
      e.preventDefault()
      if (!draggedItem || draggedItem.id === targetItem.id) return
      
      const newList = [...localCategories]
      const draggedIdx = newList.findIndex(i => i.id === draggedItem.id)
      const targetIdx = newList.findIndex(i => i.id === targetItem.id)
      
      newList.splice(draggedIdx, 1)
      newList.splice(targetIdx, 0, draggedItem)
      
      setLocalCategories(newList)
      setHasOrderChanged(true)
  }

  const handleDragEnd = () => { setDraggedItem(null) }

  const saveOrder = async () => {
      setIsSavingOrder(true)
      const items = localCategories.map((cat, idx) => ({ id: cat.id, index: idx }))
      await updateCategoryOrderAction(items)
      setHasOrderChanged(false)
      setIsSavingOrder(false)
  }

  const filteredCategories = localCategories.map(cat => ({
      ...cat,
      products: cat.products.filter((p: any) => 
          p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
          (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
      )
  })).filter(cat => cat.products.length > 0 || productSearch === "")

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Cardápio Digital</h2>
            <p className="text-muted-foreground text-sm">Gerencie produtos, categorias e preços.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." className="pl-9" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            {/* O formulário de "Novo Produto" agora é seguro */}
            <ProductForm storeId={store.id} categories={localCategories} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categorias</h3>
                {hasOrderChanged && (
                    <Button size="xs" variant="default" onClick={saveOrder} disabled={isSavingOrder} className="h-6 text-xs animate-in zoom-in">
                        {isSavingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Salvar Ordem</>}
                    </Button>
                )}
            </div>
            
            <div className="space-y-2">
                {localCategories.map((cat) => (
                    <div 
                        key={cat.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, cat)}
                        onDragOver={(e) => handleDragOver(e, cat)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            "group flex items-center justify-between p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
                            draggedItem?.id === cat.id ? "bg-slate-100 border-dashed border-slate-400 opacity-50" : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                        )}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <GripVertical className="h-4 w-4 text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="font-medium text-sm truncate">{cat.name}</span>
                        </div>
                        <DeleteCategoryBtn id={cat.id} />
                    </div>
                ))}
            </div>
            <AddCategoryForm storeId={store.id} />
        </div>

        <div className="lg:col-span-3 space-y-8">
            {localCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50 text-center">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">Seu cardápio está vazio</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mb-6">Crie categorias na esquerda para começar a adicionar produtos.</p>
                </div>
            ) : (
                filteredCategories.map((cat) => (
                    <div key={cat.id} className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 pb-2 border-b">
                            <h3 className="text-xl font-bold text-slate-800">{cat.name}</h3>
                            <Badge variant="secondary" className="text-xs font-mono">{cat.products.length}</Badge>
                        </div>
                        
                        {cat.products.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400 text-sm italic">
                                Nenhum produto nesta categoria.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cat.products.map((product: any) => (
                                    <Card key={product.id} className={cn("overflow-hidden flex flex-row items-stretch p-0 gap-0 hover:shadow-md transition-all group", !product.is_available && "opacity-60 bg-slate-50")}>
                                        <div className="w-24 bg-slate-100 shrink-0 overflow-hidden relative">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-slate-300"><ImageIcon className="h-8 w-8" /></div>
                                            )}
                                            {!product.is_available && <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]"><span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">ESGOTADO</span></div>}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ProductForm storeId={store.id} categories={localCategories} product={product} />
                                                        <DeleteProductBtn id={product.id} />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{product.description || "Sem descrição"}</p>
                                            </div>
                                            
                                            <div className="flex items-end justify-between mt-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {product.ingredients?.length > 0 && <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{product.ingredients.length} ingr.</span>}
                                                    {product.addons?.length > 0 && <span className="text-[9px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100 font-medium">+{product.addons.length} adds</span>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
                                                    <ProductToggle id={product.id} isAvailable={product.is_available} />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  )
}
