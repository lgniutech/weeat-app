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
    createIngredientAction 
} from "@/app/actions/menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, UtensilsCrossed, Image as ImageIcon, Loader2, X, Pencil, Search, UploadCloud } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// --- COMPONENTE DE SELEÇÃO DE INGREDIENTES ---
function IngredientSelector({ storeId, onSelectionChange, initialSelection = [] }: { storeId: string, onSelectionChange: (ids: string[]) => void, initialSelection?: string[] }) {
    const [input, setInput] = useState("")
    const [allIngredients, setAllIngredients] = useState<any[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection)
    const [loading, setLoading] = useState(false)

    // Carrega ingredientes
    useEffect(() => {
        getStoreIngredientsAction(storeId).then(setAllIngredients)
    }, [storeId])

    // CORREÇÃO: Sincroniza o estado local quando a prop initialSelection mudar (ao abrir o modal de edição)
    useEffect(() => {
        setSelectedIds(initialSelection)
    }, [initialSelection])

    // Notifica o pai quando a seleção muda
    useEffect(() => {
        onSelectionChange(selectedIds)
    }, [selectedIds, onSelectionChange])

    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addIngredient()
        }
    }

    const addIngredient = async () => {
        if (!input.trim()) return
        const name = input.trim()
        
        const existing = allIngredients.find(i => normalize(i.name) === normalize(name))
        
        if (existing) {
            if (!selectedIds.includes(existing.id)) {
                setSelectedIds([...selectedIds, existing.id])
            }
            setInput("")
        } else {
            setLoading(true)
            try {
                const newIng = await createIngredientAction(storeId, name)
                if (newIng) {
                    setAllIngredients(prev => [...prev, newIng].sort((a,b) => a.name.localeCompare(b.name)))
                    setSelectedIds([...selectedIds, newIng.id])
                    setInput("")
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
    }

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const filteredIngredients = allIngredients.filter(i => 
        !selectedIds.includes(i.id) && 
        (input === "" || normalize(i.name).includes(normalize(input)))
    )

    return (
        <div className="space-y-3">
            <Label>Ingredientes (Composição)</Label>
            <div className="flex gap-2 relative">
                <Input 
                    placeholder="Digite e tecle Enter para criar..." 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="pr-10"
                />
                <Button type="button" onClick={addIngredient} disabled={loading || !input.trim()} size="icon" variant="secondary" className="absolute right-0 top-0 h-full rounded-l-none">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-md border border-dashed">
                {selectedIds.length === 0 && <span className="text-xs text-muted-foreground w-full text-center py-2">Nenhum ingrediente selecionado</span>}
                {allIngredients.filter(i => selectedIds.includes(i.id)).map(ing => (
                    <Badge key={ing.id} variant="secondary" className="pl-2 pr-1 py-1 flex gap-1 items-center border-primary/20 bg-primary/5">
                        {ing.name}
                        <button type="button" onClick={() => toggleSelection(ing.id)} className="hover:bg-destructive/10 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            
            <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-3 h-3" /> Ingredientes Cadastrados
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {filteredIngredients.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                            {input ? "Nenhum ingrediente encontrado." : "Nenhum outro ingrediente disponível."}
                        </span>
                    )}
                    {filteredIngredients.map(ing => (
                        <Badge 
                            key={ing.id} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted hover:border-primary/50 transition-all active:scale-95"
                            onClick={() => toggleSelection(ing.id)}
                        >
                            <Plus className="h-3 w-3 mr-1 opacity-50" />
                            {ing.name}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    )
}

// --- COMPONENTE DE UPLOAD DE IMAGEM COM PREVIEW ---
function ImageUploadPreview({ initialImage, name }: { initialImage?: string, name: string }) {
    const [preview, setPreview] = useState<string | null>(initialImage || null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setPreview(objectUrl)
        }
    }

    return (
        <div className="space-y-2">
            <Label>Foto do Prato</Label>
            <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {preview ? (
                        <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                    )}
                </div>
                <div className="flex-1">
                    <Input 
                        type="file" 
                        name={name} 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recomendado: 800x800px (JPG, PNG)</p>
                </div>
            </div>
        </div>
    )
}

// --- FORMULÁRIOS ---

function AddCategoryForm({ storeId }: { storeId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, action, isPending] = useActionState(createCategoryAction, null)
  
  useEffect(() => {
    if (state?.success) setIsOpen(false)
  }, [state])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5">
            <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4 py-2">
            <input type="hidden" name="storeId" value={storeId} />
            <div className="space-y-2">
                <Label htmlFor="category-name">Nome da Categoria</Label>
                <Input id="category-name" name="name" placeholder="Digite o nome..." required />
            </div>
            {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Categoria"}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddProductForm({ storeId, categories }: { storeId: string, categories: any[] }) {
    const [state, action, isPending] = useActionState(createProductAction, null)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])

    useEffect(() => {
        if (state?.success) {
            setIsOpen(false)
            setSelectedIngredients([]) 
        }
    }, [state])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Novo Produto
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Adicionar Produto</DialogTitle>
                </DialogHeader>
                <form action={action} className="space-y-6">
                    <input type="hidden" name="storeId" value={storeId} />
                    <input type="hidden" name="ingredients" value={JSON.stringify(selectedIngredients)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label>Preço (R$)</Label>
                            <Input name="price" placeholder="0,00" required />
                         </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nome do Produto</Label>
                        <Input name="name" placeholder="Ex: X-Bacon Supremo" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea name="description" placeholder="Uma breve descrição..." rows={2} />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <IngredientSelector storeId={storeId} onSelectionChange={setSelectedIngredients} />
                    </div>

                    {/* Componente de Upload com Preview */}
                    <ImageUploadPreview name="image" />

                    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : "Salvar Produto"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditProductForm({ product, categories, storeId }: { product: any, categories: any[], storeId: string }) {
    const [state, action, isPending] = useActionState(updateProductAction, null)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>(product.ingredients?.map((i: any) => i.id) || [])

    useEffect(() => {
        if (state?.success) {
            setIsOpen(false)
        }
    }, [state])

    // Reseta/Sincroniza quando o modal abre
    useEffect(() => {
        if (isOpen) {
            setSelectedIngredients(product.ingredients?.map((i: any) => i.id) || [])
        }
    }, [isOpen, product])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Produto</DialogTitle>
                </DialogHeader>
                <form action={action} className="space-y-6">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="ingredients" value={JSON.stringify(selectedIngredients)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select 
                                name="categoryId" 
                                defaultValue={product.category_id}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                                required
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label>Preço (R$)</Label>
                            <Input name="price" defaultValue={product.price} required />
                         </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nome do Produto</Label>
                        <Input name="name" defaultValue={product.name} required />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea name="description" defaultValue={product.description || ""} rows={2} />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <IngredientSelector 
                            storeId={storeId} 
                            onSelectionChange={setSelectedIngredients} 
                            initialSelection={selectedIngredients}
                        />
                    </div>

                    {/* Componente de Upload com Preview - Iniciando com a imagem atual */}
                    <ImageUploadPreview name="image" initialImage={product.image_url} />

                    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteCategoryBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteCategoryAction.bind(null, id), null)
    return (
        <form action={action}>
            <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
        </form>
    )
}

function DeleteProductBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteProductAction.bind(null, id), null)
    return (
        <form action={action}>
            <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isPending}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    )
}

function ProductToggle({ id, isAvailable }: { id: string, isAvailable: boolean }) {
    return (
        <Switch checked={isAvailable} onCheckedChange={(checked) => toggleProductAvailabilityAction(id, checked)} />
    )
}

export function MenuManager({ store, categories }: { store: any, categories: any[] }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos & Categorias</h2>
          <p className="text-muted-foreground">Gerencie cardápio, preços e ingredientes.</p>
        </div>
        {categories.length > 0 && <AddProductForm storeId={store.id} categories={categories} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* COLUNA ESQUERDA: CATEGORIAS */}
        <div className="md:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categorias</h3>
            <div className="space-y-2">
                {categories.map((cat) => (
                    <div key={cat.id} className="group flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all">
                        <span className="font-medium text-sm truncate">{cat.name}</span>
                        <DeleteCategoryBtn id={cat.id} />
                    </div>
                ))}
            </div>
            <AddCategoryForm storeId={store.id} />
        </div>

        {/* COLUNA DIREITA: PRODUTOS */}
        <div className="md:col-span-3 space-y-8">
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50">
                    <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">Cardápio Vazio</h3>
                    <p className="text-muted-foreground text-sm max-w-xs text-center mb-6">Comece criando uma categoria ali na esquerda.</p>
                </div>
            ) : (
                categories.map((cat) => (
                    <div key={cat.id} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <h3 className="text-lg font-bold">{cat.name}</h3>
                            <Badge variant="secondary" className="text-xs">{cat.products.length} itens</Badge>
                        </div>
                        
                        {cat.products.length === 0 ? (
                             <p className="text-sm text-muted-foreground italic pl-2">Nenhum produto nesta categoria.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {cat.products.map((product: any) => (
                                    <Card key={product.id} className="overflow-hidden flex flex-row items-center p-3 gap-4 hover:shadow-md transition-shadow">
                                        <div className="h-20 w-20 bg-slate-100 rounded-md shrink-0 overflow-hidden flex items-center justify-center">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-slate-300" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                                {!product.is_available && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Esgotado</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{product.description || "Sem descrição"}</p>
                                            
                                            {product.ingredients && product.ingredients.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.ingredients.slice(0, 3).map((i: any) => (
                                                        <span key={i.id} className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{i.name}</span>
                                                    ))}
                                                    {product.ingredients.length > 3 && <span className="text-[10px] text-slate-400">+{product.ingredients.length - 3}</span>}
                                                </div>
                                            )}

                                            <p className="text-sm font-medium mt-1">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <ProductToggle id={product.id} isAvailable={product.is_available} />
                                            <div className="h-8 w-[1px] bg-border mx-1" />
                                            
                                            {/* BOTÃO EDITAR */}
                                            <EditProductForm product={product} categories={categories} storeId={store.id} />
                                            
                                            <DeleteProductBtn id={product.id} />
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
