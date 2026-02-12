"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2, XCircle, Wand2 } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  
  // Captura os parâmetros
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")
  const errorDesc = searchParams.get("error_description")
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")

  const handleConfirm = async () => {
    setStatus('loading')
    const supabase = createClient()

    try {
      let error = null

      // Tenta recuperar sessão existente primeiro
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
         // Já está logado, só redireciona
         window.location.href = "/?reset_password=true"
         return
      }

      // ESTRATÉGIA 1: Hash (Link Mágico / Recuperação)
      if (token_hash && type) {
        const result = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        })
        error = result.error
      } 
      // ESTRATÉGIA 2: Code (OAuth / Legado)
      else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        error = result.error
      } else {
        throw new Error("Link incompleto.")
      }

      if (error) throw error

      setStatus('success')
      
      // MUDANÇA CRUCIAL: Força o reload completo da página
      // Isso garante que o Middleware veja o cookie novo
      setTimeout(() => {
        window.location.href = "/?reset_password=true"
      }, 500)

    } catch (err: any) {
      console.error("Erro auth:", err)
      setStatus('error')
      setErrorMessage(err.message || "Link expirado ou inválido.")
    }
  }

  // Se já vier com erro na URL
  if (errorDesc) {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-destructive/10 p-3 rounded-full text-destructive">
                <XCircle className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-lg font-semibold">Erro no Link</h3>
                <p className="text-sm text-muted-foreground">{errorDesc.replace(/\+/g, " ")}</p>
            </div>
            <Button asChild variant="outline">
                <a href="/login">Voltar</a>
            </Button>
        </div>
      )
  }

  // Validação Visual
  const isValidLink = !!(token_hash || code);

  if (!isValidLink) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <XCircle className="w-8 h-8" />
        </div>
        <div>
            <h3 className="text-lg font-semibold">Link Inválido</h3>
            <p className="text-sm text-muted-foreground">O link não possui o código de segurança.</p>
        </div>
        <Button asChild variant="outline">
            <a href="/login">Voltar ao Login</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300 w-full">
      
      <div className={`p-4 rounded-full transition-all duration-500 ${
        status === 'success' ? 'bg-green-100 text-green-600' :
        status === 'error' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      }`}>
        {status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> :
         status === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
         status === 'error' ? <XCircle className="w-10 h-10" /> :
         <Wand2 className="w-10 h-10" />}
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {status === 'success' ? 'Acesso Liberado!' : 
           status === 'error' ? 'Erro no Acesso' :
           'Acesso Seguro'}
        </h2>
        <p className="text-muted-foreground max-w-[280px] mx-auto">
          {status === 'success' ? 'Entrando no sistema...' :
           status === 'error' ? errorMessage :
           'Clique abaixo para confirmar seu acesso seguro.'}
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
            <Suspense fallback={<p>Carregando...</p>}>
                <VerifyContent />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
