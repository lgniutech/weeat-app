"use client"

import { useState, useEffect, useRef } from "react"
import { useActionState } from "react" // Nota: em Next 15 pode ser useActionState, em 14 useFormState. Ajuste conforme sua versão.
import { createCategoryAction, deleteCategoryAction, createProductAction, deleteProductAction, toggleProductAvailabilityAction, getStoreIngredientsAction, createIngredientAction } from "@/app/actions/menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, UtensilsCrossed, Image as ImageIcon, Loader2, X, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// --- COMPONENTE DE SELEÇÃO DE INGREDIENTES ---
function IngredientSelector({ storeId, onSelectionChange }: { storeId: string, onSelectionChange: (ids: string[]) => void }) {
    const [input, setInput] = useState("")
    const [allIngredients, setAllIngredients] = useState<any[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    // Carrega ingredientes existentes ao montar
    useEffect(() => {
        getStoreIngredientsAction(storeId).then(setAllIngredients)
    }, [storeId])

    // Notifica o pai quando a seleção muda
    useEffect(() => {
        onSelectionChange(selectedIds)
    }, [selectedIds, onSelectionChange])

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addIngredient()
        }
    }

    const addIngredient = async () => {
        if (!input.trim()) return
        const name = input.trim()
        
        // Verifica se já existe na lista (local)
        const existing = allIngredients.find(i => i.name.toLowerCase() === name.toLowerCase())
        
        if (existing) {
            if (!selectedIds.includes(existing.id)) {
                setSelectedIds([...selectedIds, existing.id])
            }
            setInput("")
        } else {
            // Cria novo ingrediente
            setLoading(true)
            try {
                const newIng = await createIngredientAction(storeId, name)
                if (newIng) {
                    setAllIngredients([...allIngredients, newIng])
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

    return (
        <div className="space-y-3">
            <Label>Ingredientes (Composição)</Label>
            <div className="flex gap-2">
                <Input 
                    placeholder="Digite e tecle Enter (Ex: Bacon)" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <Button type="button" onClick={addIngredient} disabled={loading || !input.trim()} size="icon" variant="secondary">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {/* Lista de Selecionados */}
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
            
            {/* Sugestões (Não selecionados) */}
            {allIngredients.length > selectedIds.length && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Sugestões:</p>
                    <div className="flex flex-wrap gap-2">
                        {allIngredients.filter(i => !selectedIds.includes(i.id)).map(ing => (
                            <Badge 
                                key={ing.id} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-muted hover:border-primary/50 transition-all"
                                onClick={() => toggleSelection(ing.id)}
                            >
                                <Plus className="h-3 w-3 mr-1 opacity-50" />
                                {ing.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// --- FORMULÁRIOS WRAPPERS ---

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
          <DialogDescription>Ex: Lanches, Bebidas, Sobremesas</DialogDescription>
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
            setSelectedIngredients([]) // Reset
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
                    {/* Campo oculto para enviar o JSON dos ingredientes */}
                    <input type="hidden" name="ingredients" value={JSON.stringify(selectedIngredients)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required>
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

                    {/* SELETOR DE INGREDIENTES */}
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <IngredientSelector storeId={storeId} onSelectionChange={setSelectedIngredients} />
                    </div>

                    <div className="space-y-2">
                        <Label>Foto do Prato</Label>
                        <Input type="file" name="image" accept="image/*" />
                    </div>

                    {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : "Salvar Produto"}
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
                                            
                                            {/* Exibição dos Ingredientes no Card do Admin */}
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

                                        <div className="flex items-center gap-2">
                                            <ProductToggle id={product.id} isAvailable={product.is_available} />
                                            <div className="h-8 w-[1px] bg-border mx-1" />
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
