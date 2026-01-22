"use client"

import { useState, useActionState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createStoreAction } from "@/app/actions/store"
import { Loader2, Building2, User, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function StoreSetupModal() {
  const [open, setOpen] = useState(true)
  const [state, action, isPending] = useActionState(createStoreAction, null)
  
  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      window.location.reload()
    }
  }, [state?.success])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[425px] [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Boas-vindas ao weeat!</DialogTitle>
          <DialogDescription className="text-center">
            Finalize seu cadastro definindo sua senha e os dados da loja.
          </DialogDescription>
        </DialogHeader>
        
        <form action={action} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="ownerName" className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Seu Nome Completo
            </Label>
            <Input 
              id="ownerName" 
              name="ownerName" 
              placeholder="Ex: Luis Ghidini" 
              required 
            />
          </div>

          {/* Campo Novo: Definição de Senha */}
          <div className="grid gap-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Crie sua Senha de Acesso
            </Label>
            <Input 
              id="password" 
              name="password" 
              type="password"
              placeholder="Mínimo 6 caracteres" 
              required 
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Você usará esta senha para entrar no sistema futuramente.
            </p>
          </div>

          <div className="border-t my-2" />

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Estabelecimento</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="Ex: Pizzaria do João" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
               <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
               <Input 
                 id="cnpj" 
                 name="cnpj" 
                 placeholder="00.000.000/0001-00" 
               />
            </div>
            <div className="grid gap-2">
               <Label htmlFor="phone">WhatsApp / Telefone</Label>
               <Input 
                 id="phone" 
                 name="phone" 
                 placeholder="(11) 99999-9999" 
                 required 
               />
            </div>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta e loja...
              </>
            ) : (
              "Finalizar Cadastro"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
