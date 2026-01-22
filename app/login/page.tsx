"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, null);

  // Link do WhatsApp formatado com mensagem pré-definida
  const whatsappLink = "https://wa.me/5516994484888?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20contratar%20o%20weeat%21";

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          weeat
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Gerenciar meu delivery nunca foi tão simples e bonito. O weeat mudou o jogo para o meu restaurante.&rdquo;
            </p>
            <footer className="text-sm">Sofia Davis - La Pizza</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Acesse sua conta
              </CardTitle>
              <CardDescription>
                Entre com seu e-mail e senha abaixo
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <Input id="password" name="password" type="password" required />
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
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="text-sm text-muted-foreground text-center">
                Ainda não é parceiro?{" "}
                <Link
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-primary font-medium"
                >
                  Fale com o comercial
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
