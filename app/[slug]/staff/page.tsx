"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { verifyStaffPinAction } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { User, Delete, ArrowRight, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"

export default function StaffLoginPage({ params }: { params: { slug: string } }) {
  const [pin, setPin] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num)
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (pin.length !== 4) return

    startTransition(async () => {
      const res = await verifyStaffPinAction(params.slug, pin)
      if (res.error) {
        toast({
          title: "Acesso Negado",
          description: res.error,
          variant: "destructive",
        })
        setPin("")
      } else if (res.redirectUrl) {
        toast({
            title: "Sucesso",
            description: "Login realizado com sucesso!",
            className: "bg-green-600 text-white"
        })
        router.push(res.redirectUrl)
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary p-6 text-primary-foreground text-center">
          <div className="mx-auto bg-primary-foreground/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <LockKeyhole className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Digite seu PIN de 4 dígitos</p>
        </div>

        {/* Display do PIN */}
        <div className="p-8 pb-4">
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full transition-all duration-300",
                  pin.length > i 
                    ? "bg-primary scale-110" 
                    : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="hidden">
             <Input 
                type="password" 
                value={pin} 
                onChange={(e) => setPin(e.target.value.slice(0,4))} 
                autoFocus 
             />
          </form>

          {/* Teclado Numérico */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-2xl font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                onClick={() => handleNumberClick(num.toString())}
                disabled={isPending}
                type="button"
              >
                {num}
              </Button>
            ))}
            
            <Button
              variant="ghost"
              className="h-16 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
              onClick={handleDelete}
              disabled={isPending || pin.length === 0}
              type="button"
            >
              <Delete className="w-8 h-8" />
            </Button>
            
            <Button
              variant="outline"
              className="h-16 text-2xl font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              onClick={() => handleNumberClick("0")}
              disabled={isPending}
              type="button"
            >
              0
            </Button>

            <Button
              className={cn(
                  "h-16 rounded-xl transition-all active:scale-95",
                  pin.length === 4 ? "bg-primary hover:bg-primary/90" : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => handleSubmit()}
              disabled={isPending || pin.length !== 4}
              type="submit"
            >
              {isPending ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              ) : (
                  <ArrowRight className="w-8 h-8" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-950 p-4 text-center border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-muted-foreground">Área exclusiva para funcionários.</p>
        </div>
      </div>
    </div>
  )
}
