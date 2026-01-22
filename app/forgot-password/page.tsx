"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, null);

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:px-0 bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Recuperar Senha
            </CardTitle>
            <CardDescription>
              Digite seu e-mail e enviaremos um link para você criar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state?.success ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="bg-green-100 p-3 rounded-full text-green-600 dark:bg-green-900/30">
                  <Mail className="w-6 h-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de recuperação para o seu e-mail. Verifique sua caixa de entrada (e spam).
                </p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/login">Voltar para o Login</Link>
                </Button>
              </div>
            ) : (
              <form action={action}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      placeholder="nome@exemplo.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
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
                </div>
              </form>
            )}
          </CardContent>
          {!state?.success && (
            <CardFooter className="flex justify-center">
              <Link
                href="/login"
                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o Login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
