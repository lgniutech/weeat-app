"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2, XCircle, Bug } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const errorParam = searchParams.get("error")
  const errorDesc = searchParams.get("error_description")
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [debugLog, setDebugLog] = useState<string[]>([])

  const addLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])

  useEffect(() => {
    // Log inicial ao carregar a página
    addLog("Página carregada.")
    addLog(`URL Params: code=${code ? 'SIM' : 'NÃO'}, token_hash=${token_hash ? 'SIM' : 'NÃO'}, type=${type || 'N/A'}`)
    
    if (errorParam) {
        addLog(`ERRO VINDO DA URL: ${errorParam} - ${errorDesc}`)
        setStatus('error')
    }
  }, [])

  const handleConfirm = async () => {
    setStatus('loading')
    addLog("Iniciando verificação...")
    const supabase = createClient()

    try {
      let result: any = {}

      if (token_hash && type) {
        addLog(`Tentando verifyOtp com Hash... Type: ${type}`)
        result = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        })
      } else if (code) {
        addLog("Tentando exchangeCodeForSession com Code...")
        result = await supabase.auth.exchangeCodeForSession(code)
      } else {
        throw new Error("Nenhum código encontrado na URL.")
      }

      if (result.error) {
        addLog(`ERRO SUPABASE: ${result.error.message}`)
        addLog(`STATUS: ${result.error.status || 'N/A'}`)
        throw result.error
      }

      addLog("Sucesso! Sessão criada.")
      setStatus('success')
      
      setTimeout(() => {
        router.push("/?reset_password=true") 
        router.refresh()
      }, 1500)

    } catch (err: any) {
      console.error(err)
      setStatus('error')
      addLog(`CATCH: ${err.message || JSON.stringify(err)}`)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300 w-full">
      
      {/* Ícone */}
      <div className={`p-4 rounded-full ${
        status === 'success' ? 'bg-green-100 text-green-600' :
        status === 'error' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        {status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> :
         status === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
         status === 'error' ? <Bug className="w-10 h-10" /> :
         <ShieldCheck className="w-10 h-10" />}
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Verificação</h2>
        <p className="text-muted-foreground">Clique para validar.</p>
      </div>

      {/* ÁREA DE LOG DE DIAGNÓSTICO (O que eu preciso ver) */}
      <Alert className="text-left text-xs font-mono bg-slate-950 text-slate-50 border-slate-800 p-4 max-h-60 overflow-y-auto w-full">
        <AlertDescription>
            <p className="font-bold border-b border-slate-700 pb-2 mb-2">DIAGNÓSTICO TÉCNICO:</p>
            {debugLog.length === 0 && <p className="opacity-50">Aguardando ação...</p>}
            {debugLog.map((log, i) => (
                <div key={i} className="mb-1 border-b border-slate-900/50 pb-1 last:border-0">{log}</div>
            ))}
        </AlertDescription>
      </Alert>

      {/* Botão */}
      <Button 
        size="lg" 
        className="w-full font-bold"
        onClick={handleConfirm}
        disabled={status === 'loading' || status === 'success'}
      >
        {status === 'loading' ? 'Processando...' : 
         status === 'success' ? 'Redirecionando...' : 
         <>Confirmar Acesso <ArrowRight className="ml-2 w-4 h-4" /></>}
      </Button>
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
