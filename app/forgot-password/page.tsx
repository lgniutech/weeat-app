"use client"

import { useActionState } from "react"
import { verifyOtpAction } from "@/app/actions/auth"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, KeyRound } from "lucide-react"

export default function VerifyCodePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const [state, action, isPending] = useActionState(verifyOtpAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Verificar Código</CardTitle>
          <CardDescription>
            Enviamos um código de 6 dígitos para <strong>{email}</strong>.
            <br/>Digite-o abaixo para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {/* Campo oculto para passar o email */}
            <input type="hidden" name="email" value={email} />

            <div className="space-y-2">
              <Label htmlFor="code">Código de Verificação</Label>
              <Input 
                id="code" 
                name="code" 
                type="text" 
                placeholder="123456" 
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required 
                autoFocus
              />
            </div>

            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                "Verificar Código"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <Link 
            href="/forgot-password" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar e reenviar
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
