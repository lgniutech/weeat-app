"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2, XCircle, KeyRound } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // O Supabase manda 'code' (PKCE) OU 'token_hash' + 'type' (Recovery)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as any // 'recovery' | 'signup' | 'magiclink'
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")

  const handleConfirm = async () => {
    setStatus('loading')
    const supabase = createClient()

    try {
      let error = null

      // ESTRATÉGIA 1: Se for Recuperação de Senha (token_hash)
      // Esse é o método mais robusto para "Esqueci a Senha"
      if (token_hash && type) {
        const result = await supabase.auth.verifyOtp({
          token_hash,
          type,
        })
        error = result.error
      } 
      // ESTRATÉGIA 2: Se for Código OAuth (code)
      else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        error = result.error
      } else {
        throw new Error("Link incompleto.")
      }

      if (error) throw error

      setStatus('success')
      
      // Redireciona para Home e abre o modal de configurações automaticamente
      setTimeout(() => {
        // Adicionamos ?reset=true para você poder abrir o modal de senha se quiser
        router.push("/?reset_password=true") 
        router.refresh()
      }, 1000)

    } catch (err: any) {
      console.error("Erro na verificação:", err)
      setStatus('error')
      setErrorMessage("O link expirou ou já foi utilizado. Solicite um novo.")
    }
  }

  // Se não tiver nenhum código, mostra erro visual
  if (!code && !token_hash) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <XCircle className="w-8 h-8" />
        </div>
        <div>
            <h3 className="text-lg font-semibold">Link Inválido</h3>
            <p className="text-sm text-muted-foreground">O link não contém os códigos de segurança necessários.</p>
        </div>
        <Button asChild variant="outline">
            <a href="/login">Voltar ao Login</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
      
      <div className={`p-4 rounded-full transition-all duration-500 ${
        status === 'success' ? 'bg-green-100 text-green-600' :
        status === 'error' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      }`}>
        {status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> :
         status === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
         status === 'error' ? <XCircle className="w-10 h-10" /> :
         <KeyRound className="w-10 h-10" />}
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {status === 'success' ? 'Acesso Liberado!' : 
           status === 'error' ? 'Link Expirado' :
           'Recuperação de Acesso'}
        </h2>
        <p className="text-muted-foreground max-w-[280px] mx-auto">
          {status === 'success' ? 'Entrando no painel...' :
           status === 'error' ? errorMessage :
           'Clique abaixo para confirmar sua identidade e acessar o sistema.'}
        </p>
      </div>

      {status === 'error' ? (
        <Button asChild variant="outline" className="w-full">
           <a href="/forgot-password">Solicitar Novo Link</a>
        </Button>
      ) : (
        <Button 
          size="lg" 
          className="w-full font-bold shadow-lg shadow-primary/20"
          onClick={handleConfirm}
          disabled={status === 'loading' || status === 'success'}
        >
          {status === 'loading' ? 'Validando...' : 
           status === 'success' ? 'Redirecionando...' : 
           <>Confirmar e Entrar <ArrowRight className="ml-2 w-4 h-4" /></>}
        </Button>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardContent className="pt-8 pb-8">
            <Suspense fallback={
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
            }>
                <VerifyContent />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
