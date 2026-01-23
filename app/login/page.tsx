"use client"

import { useActionState, useEffect, useState, Suspense } from "react"
import { loginAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, ChefHat, AlertCircle } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, action, isPending] = useActionState(loginAction, null)
  
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // 1. Verifica erros na URL e TRADUZ para Português
    if (typeof window !== "undefined") {
      const hash = window.location.hash
      
      if (hash && hash.includes("error")) {
         const params = new URLSearchParams(hash.substring(1)) // remove o #
         let description = params.get("error_description")?.replace(/\+/g, " ") || ""
         let code = params.get("error_code") || ""

         // TRADUÇÃO DE ERROS COMUNS DO SUPABASE
         if (code === "otp_expired" || description.includes("Email link is invalid")) {
            description = "Este link de acesso expirou ou já foi utilizado."
         } else if (description.includes("Invalid login credentials")) {
            description = "E-mail ou senha incorretos."
         } else if (description.includes("Rate limit exceeded")) {
            description = "Muitas tentativas consecutivas. Aguarde um pouco."
         } else if (description.includes("User already registered")) {
            description = "Este e-mail já possui cadastro."
         }

         if (description) setUrlError(description)
      }
    }

    // 2. Verifica fluxo de convite
    const type = searchParams.get("type")
    if (type === "invite") {
      setInviteMessage("Validando seu convite...")
      setIsRedirecting(true)
    }

    // 3. Ouve login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        if (window.location.hash.includes("error")) return
        setIsRedirecting(true)
        setInviteMessage("Login confirmado! Entrando...")
        setTimeout(() => {
            router.push("/")
            router.refresh()
        }, 1000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  return (
    <Card className="w-full max-w-md border-none shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Bem-vindo ao weeatapp</CardTitle>
        <CardDescription>
          Entre para gerenciar seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        
        {urlError && (
            <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-col gap-2">
                    <span>{urlError}</span>
                    <Link href="/forgot-password">
                        <Button variant="outline" size="sm" className="w-full mt-2 border-destructive/50 hover:bg-destructive/10">
                            Solicitar novo link
                        </Button>
                    </Link>
                </AlertDescription>
            </Alert>
        )}

        {isRedirecting ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{inviteMessage || "Redirecionando..."}</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
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
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                "Entrar na Loja"
              )}
            </Button>
          </form>
        )}
      </CardContent>
      
      {!isRedirecting && (
          <CardFooter className="justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
              Criar conta
              </Link>
          </p>
          </CardFooter>
      )}
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-2">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
