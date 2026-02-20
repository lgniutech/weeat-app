"use client"

import { useState } from "react"
import Link from "next/link"

interface Store {
  id: string
  name: string
  slug: string
  gtm_id: string | null
  totalOrders: number
  totalRevenue: number
}

export function AdminHome({ stores, adminToken }: { stores: Store[]; adminToken: string }) {
  const [search, setSearch] = useState("")

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  )

  const totalOrders = stores.reduce((sum, s) => sum + s.totalOrders, 0)
  const totalRevenue = stores.reduce((sum, s) => sum + s.totalRevenue, 0)
  const withGtm = stores.filter((s) => s.gtm_id).length

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-white">WeEat Admin</span>
          </div>
          <span className="text-xs text-zinc-600">Painel da Agência</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Lojas ativas" value={stores.length.toString()} color="text-white" />
          <StatCard label="Com GTM" value={withGtm.toString()} color="text-green-400" />
          <StatCard label="Total de pedidos" value={totalOrders.toLocaleString("pt-BR")} color="text-sky-400" />
          <StatCard
            label="Faturamento total"
            value={totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            color="text-emerald-400"
          />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar loja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all"
          />
        </div>

        {/* Lista de lojas */}
        <div className="space-y-2">
          {filtered.map((store) => (
            <Link
              key={store.id}
              href={`/admin/${store.id}?token=${adminToken}`}
              className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl px-5 py-4 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* GTM indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${store.gtm_id ? "bg-green-400" : "bg-zinc-700"}`} />
                <div>
                  <p className="font-semibold text-white group-hover:text-sky-300 transition-colors">{store.name}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">/{store.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{store.totalOrders.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-zinc-500">pedidos</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-emerald-400">
                    {store.totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-xs text-zinc-500">faturamento</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium px-2 py-1 rounded-md ${store.gtm_id ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {store.gtm_id || "Sem GTM"}
                  </p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-600">Nenhuma loja encontrada.</div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}
