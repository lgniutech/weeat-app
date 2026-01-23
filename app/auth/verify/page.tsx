"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  // O Supabase envia o código na URL (ex: ?code=xyz...)
  const code = searchParams.get("code")
  // Pegamos qualquer outro parametro (como next) para repassar
  const next = searchParams.get("next") || "/"

  if (!code) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
            <h3 className="text-lg font-semibold">Link Inválido</h3>
            <p className="text-sm text-muted-foreground">Não encontramos o código de verificação.</p>
        </div>
        <Button asChild variant="outline">
            <a href="/login">Voltar ao Login</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-600 dark:text-green-400">
        <ShieldCheck className="w-10 h-10" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Verificação de Segurança</h2>
        <p className="text-muted-foreground max-w-[280px] mx-auto">
          Clique no botão abaixo para confirmar que é você e acessar o sistema.
        </p>
      </div>

      {/* O Botão leva para a rota que faz o login real (/auth/callback).
         Isso impede que scanners de email consumam o link, pois eles não clicam em botões.
      */}
      <Button asChild size="lg" className="w-full font-bold shadow-lg shadow-primary/20">
        <a href={`/auth/callback?code=${code}&next=${next}`}>
           Confirmar e Entrar <ArrowRight className="ml-2 w-4 h-4" />
        </a>
      </Button>
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
                    <p className="text-sm text-muted-foreground">Verificando link...</p>
                </div>
            }>
                <VerifyContent />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
