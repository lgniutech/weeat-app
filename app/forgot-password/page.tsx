"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu e-mail para receber o link de redefinição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state?.success ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center text-green-500">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {state.success}
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/login">Voltar para Login</Link>
                </Button>
              </div>
            ) : (
              <form action={action} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Seu E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nome@exemplo.com"
                    required
                  />
                </div>

                {state?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}

                <Button className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          {!state?.success && (
            <CardFooter className="flex justify-center border-t pt-4">
              <Link 
                href="/login" 
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para o Login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
