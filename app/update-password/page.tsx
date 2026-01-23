"use client"

import { useActionState } from "react"
import { updatePasswordAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, CheckCircle2 } from "lucide-react"

export default function UpdatePasswordPage() {
  const [state, action, isPending] = useActionState(updatePasswordAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Nova Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha segura abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9"
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  placeholder="Repita a senha"
                  className="pl-9"
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</>
              ) : (
                "Atualizar Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
