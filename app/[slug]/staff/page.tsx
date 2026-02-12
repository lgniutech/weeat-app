"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { verifyStaffPinAction } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Delete, Loader2, Store, User } from "lucide-react"

export default function StaffLoginPage({ params }: { params: { slug: string } }) {
  const [pin, setPin] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleLogin = () => {
    if (pin.length !== 4) return

    startTransition(async () => {
      // No Next.js 15+, params pode ser uma promise, mas aqui tratamos o acesso direto
      // Se der erro de build, use `use(params)` ou `await params` dependendo da versão exata
      const slug = params.slug 
      const result = await verifyStaffPinAction(slug, pin)

      if (result.error) {
        toast({
          title: "Acesso Negado",
          description: result.error,
          variant: "destructive"
        })
        setPin("") 
      } else if (result.success && result.redirectUrl) {
        toast({
          title: "Bem-vindo!",
          description: "Entrando no sistema...",
        })
        router.push(result.redirectUrl)
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      
      {/* Cabeçalho */}
      <div className="mb-8 text-center space-y-2">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
           <Store className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Portal da Equipe</h1>
        <p className="text-muted-foreground text-sm">Digite seu PIN de 4 dígitos</p>
      </div>

      {/* Visor do PIN (Bolinhas) */}
      <div className="mb-8 flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-300 border border-slate-300 dark:border-slate-700 ${
              pin.length > i 
                ? "bg-primary border-primary scale-125 shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                : "bg-slate-200 dark:bg-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Teclado Numérico */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[300px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            variant="outline"
            className="h-20 text-3xl font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-all active:scale-95 shadow-sm"
            onClick={() => handleNumberClick(num)}
            disabled={isPending}
          >
            {/* Garantindo que usa a fonte padrão do projeto (Gate) e não mono */}
            <span className="font-sans">{num}</span>
          </Button>
        ))}
        
        {/* Espaço Vazio */}
        <div />

        <Button
          variant="outline"
          className="h-20 text-3xl font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-all active:scale-95 shadow-sm"
          onClick={() => handleNumberClick(0)}
          disabled={isPending}
        >
           <span className="font-sans">0</span>
        </Button>

        <Button
          variant="ghost"
          className="h-20 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Delete className="w-8 h-8" />
        </Button>
      </div>

      {/* Botão Entrar */}
      <div className="mt-8 w-full max-w-[300px]">
        <Button 
          className="w-full h-14 text-lg font-bold shadow-md" 
          size="lg"
          onClick={handleLogin}
          disabled={pin.length !== 4 || isPending}
        >
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <User className="mr-2 h-5 w-5" />}
          {isPending ? "Validando..." : "ACESSAR"}
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        WeEat Ops v2.0 • Acesso Restrito
      </p>
    </div>
  )
}
