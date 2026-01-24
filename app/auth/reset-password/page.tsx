import { redirect } from "next/navigation";

// ESTE ARQUIVO É OBSOLETO (ZUMBI)
// Ele existe apenas para o build não quebrar caso você não consiga apagá-lo.
export default function ResetPasswordPage() {
  // Redireciona qualquer um que cair aqui por engano
  return redirect("/login");
}
