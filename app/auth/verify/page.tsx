"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get("code")
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")

  // Função que realiza o login IMEDIATAMENTE ao clicar
  const handleConfirm = async () => {
    if (!code) return

    setStatus('loading')
    const supabase = createClient()

    try {
      // Tenta trocar o código pela sessão aqui mesmo no navegador
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        throw error
      }

      // SUCESSO!
      setStatus('success')
      
      // Aguarda um instante para o usuário ver o "Sucesso" e redireciona
      setTimeout(() => {
        router.push("/") // Manda pra Home
        router.refresh() // Atualiza os dados
      }, 1000)

    } catch (err: any) {
      console.error("Erro na verificação:", err)
      setStatus('error')
      setErrorMessage("O link expirou ou é inválido. Tente solicitar novamente.")
    }
  }

  if (!code) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <XCircle className="w-8 h-8" />
        </div>
        <div>
            <h3 className="text-lg font-semibold">Link Inválido</h3>
            <p className="text-sm text-muted-foreground">Não encontramos o código de verificação na URL.</p>
        </div>
        <Button asChild variant="outline">
            <a href="/login">Voltar ao Login</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
      
      {/* ÍCONE DE STATUS */}
      <div className={`p-4 rounded-full transition-all duration-500 ${
        status === 'success' ? 'bg-green-100 text-green-600' :
        status === 'error' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      }`}>
        {status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> :
         status === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
         status === 'error' ? <XCircle className="w-10 h-10" /> :
         <ShieldCheck className="w-10 h-10" />}
      </div>
      
      {/* TEXTOS */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {status === 'success' ? 'Acesso Confirmado!' : 
           status === 'error' ? 'Erro no Acesso' :
           'Verificação de Segurança'}
        </h2>
        <p className="text-muted-foreground max-w-[280px] mx-auto">
          {status === 'success' ? 'Entrando no sistema...' :
           status === 'error' ? errorMessage :
           'Para sua segurança, clique no botão abaixo para liberar o acesso.'}
        </p>
      </div>

      {/* BOTÃO DE AÇÃO */}
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
          {status === 'loading' ? 'Verificando...' : 
           status === 'success' ? 'Redirecionando...' : 
           <>Confirmar Acesso <ArrowRight className="ml-2 w-4 h-4" /></>}
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
