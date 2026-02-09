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
      // Resolve a promise do params para pegar o slug
      const resolvedParams = await params;
      const result = await verifyStaffPinAction(resolvedParams.slug, pin)

      if (result.error) {
        toast({
          title: "Acesso Negado",
          description: result.error,
          variant: "destructive"
        })
        setPin("") // Limpa o PIN no erro
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      
      {/* Cabeçalho */}
      <div className="mb-8 text-center space-y-2">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
           <Store className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Portal da Equipe</h1>
        <p className="text-slate-400 text-sm">Digite seu PIN de 4 dígitos</p>
      </div>

      {/* Visor do PIN */}
      <div className="mb-8 flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              pin.length > i 
                ? "bg-primary scale-125 shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                : "bg-slate-800"
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
            className="h-20 text-2xl font-bold bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
            onClick={() => handleNumberClick(num)}
            disabled={isPending}
          >
            {num}
          </Button>
        ))}
        
        {/* Botão Vazio para alinhar */}
        <div />

        <Button
          variant="outline"
          className="h-20 text-2xl font-bold bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
          onClick={() => handleNumberClick(0)}
          disabled={isPending}
        >
          0
        </Button>

        <Button
          variant="ghost"
          className="h-20 text-red-400 hover:bg-red-950/30 hover:text-red-300"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Delete className="w-8 h-8" />
        </Button>
      </div>

      {/* Botão Entrar */}
      <div className="mt-8 w-full max-w-[300px]">
        <Button 
          className="w-full h-14 text-lg font-bold" 
          size="lg"
          onClick={handleLogin}
          disabled={pin.length !== 4 || isPending}
        >
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <User className="mr-2 h-5 w-5" />}
          {isPending ? "Validando..." : "ACESSAR"}
        </Button>
      </div>

      <p className="mt-8 text-xs text-slate-600">
        WeEat Ops v2.0 • Acesso Restrito
      </p>
    </div>
  )
}
