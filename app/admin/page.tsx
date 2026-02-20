import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminPanel } from "./admin-panel"

export const metadata = {
  title: "Admin — WeEat",
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  // Verifica token de acesso via query param ou cookie
  const { token } = await searchParams
  const adminToken = process.env.ADMIN_SECRET_TOKEN

  if (!adminToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-red-400">
          ⚠️ Variável <code>ADMIN_SECRET_TOKEN</code> não configurada no .env
        </p>
      </div>
    )
  }

  if (token !== adminToken) {
    return <AdminLogin />
  }

  // Token válido — busca todas as lojas
  const supabase = await createClient()
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, gtm_id")
    .order("name", { ascending: true })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-red-400">Erro ao buscar lojas: {error.message}</p>
      </div>
    )
  }

  return <AdminPanel stores={stores || []} adminToken={adminToken} />
}

function AdminLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Painel Admin</h1>
          <p className="text-zinc-500 text-sm mt-1">Acesso restrito à equipe da agência</p>
        </div>
        <form action="/admin" method="GET" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Token de acesso
            </label>
            <input
              type="password"
              name="token"
              placeholder="••••••••••••"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
