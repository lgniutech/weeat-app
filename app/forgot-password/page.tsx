"use client"

import { useActionState } from "react"
import { forgotPasswordAction } from "@/app/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, ArrowLeft, KeyRound } from "lucide-react"

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
          <CardDescription>
            Digite seu e-mail para receber as instruções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.success ? (
            <Alert className="bg-green-50 text-green-700 border-green-200">
              <AlertDescription className="flex flex-col gap-2">
                <span className="font-semibold">E-mail enviado!</span>
                Verifique sua caixa de entrada (e spam) para redefinir sua senha.
              </AlertDescription>
            </Alert>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail cadastrado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="seu@email.com" 
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <Link 
            href="/login" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
