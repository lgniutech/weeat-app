"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { createCategoryAction, deleteCategoryAction, createProductAction, deleteProductAction, toggleProductAvailabilityAction } from "@/app/actions/menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, UtensilsCrossed, Image as ImageIcon, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Componente Wrapper para adicionar nova Categoria
function AddCategoryForm({ storeId }: { storeId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  // useActionState na raiz do componente (correto)
  const [state, action, isPending] = useActionState(createCategoryAction, null)
  
  // Efeito para fechar o modal quando der sucesso
  useEffect(() => {
    if (state?.success) {
        setIsOpen(false)
    }
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
        
        {/* FORMULÁRIO NATIVO: A forma correta de usar server actions */}
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

// Componente Wrapper para adicionar Produto
function AddProductForm({ storeId, categories }: { storeId: string, categories: any[] }) {
    const [state, action, isPending] = useActionState(createProductAction, null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (state?.success) {
            setIsOpen(false)
        }
    }, [state])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Novo Produto
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Adicionar Produto</DialogTitle>
                </DialogHeader>
                <form action={action} className="space-y-4">
                    <input type="hidden" name="storeId" value={storeId} />
                    
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
                        <Textarea name="description" placeholder="Pão, carne, queijo..." rows={2} />
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

// Botão de Excluir Categoria
function DeleteCategoryBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteCategoryAction.bind(null, id), null)
    return (
        <form action={action}>
            <Button 
                variant="ghost" 
                size="icon" 
                type="submit"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
        </form>
    )
}

// Botão de Excluir Produto
function DeleteProductBtn({ id }: { id: string }) {
    const [state, action, isPending] = useActionState(deleteProductAction.bind(null, id), null)
    return (
        <form action={action}>
            <Button 
                variant="ghost" 
                size="icon" 
                type="submit"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={isPending}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    )
}

// Toggle Disponibilidade
function ProductToggle({ id, isAvailable }: { id: string, isAvailable: boolean }) {
    return (
        <Switch 
            checked={isAvailable} 
            onCheckedChange={(checked) => toggleProductAvailabilityAction(id, checked)}
        />
    )
}

export function MenuManager({ store, categories }: { store: any, categories: any[] }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos & Categorias</h2>
          <p className="text-muted-foreground">Gerencie o cardápio completo da sua loja.</p>
        </div>
        {categories.length > 0 && <AddProductForm storeId={store.id} categories={categories} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* COLUNA ESQUERDA: LISTA DE CATEGORIAS */}
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

        {/* COLUNA DIREITA: PRODUTOS POR CATEGORIA */}
        <div className="md:col-span-3 space-y-8">
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50">
                    <UtensilsCrossed className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">Cardápio Vazio</h3>
                    <p className="text-muted-foreground text-sm max-w-xs text-center mb-6">Comece criando uma categoria (ex: "Lanches") ali na esquerda.</p>
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
                                        {/* Imagem */}
                                        <div className="h-16 w-16 bg-slate-100 rounded-md shrink-0 overflow-hidden flex items-center justify-center">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-slate-300" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                                {!product.is_available && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Esgotado</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{product.description || "Sem descrição"}</p>
                                            <p className="text-sm font-medium mt-1">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                            </p>
                                        </div>

                                        {/* Ações */}
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
