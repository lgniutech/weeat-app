"use client"

import { useActionState, Suspense, useState } from "react"
import { resetPasswordWithCodeAction } from "@/app/actions/auth"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, KeyRound, Lock, Eye, EyeOff } from "lucide-react"

function VerifyAndResetContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const [state, action, isPending] = useActionState(resetPasswordWithCodeAction, null)
  
  // Controle de visibilidade da senha
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-full max-w-md border-none shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
        <CardDescription>
          Para sua segurança, digite o código enviado para <strong>{email}</strong> e crie sua nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="email" value={email} />

          {/* Campo de Código */}
          <div className="space-y-2">
            <Label htmlFor="code">Código de 6 Dígitos</Label>
            <Input 
              id="code" 
              name="code" 
              type="text" 
              placeholder="000000" 
              className="text-center text-lg tracking-[0.5em] font-mono"
              maxLength={6}
              required 
            />
          </div>

          <div className="border-t my-4 opacity-50"></div>

          {/* Campos de Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="******" 
                className="pl-9 pr-9"
                required 
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type={showPassword ? "text" : "password"} 
                placeholder="******" 
                className="pl-9"
                required 
                minLength={6}
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
              "Alterar Senha e Entrar"
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
          Voltar e reenviar código
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function VerifyCodePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      }>
        <VerifyAndResetContent />
      </Suspense>
    </div>
  )
}
