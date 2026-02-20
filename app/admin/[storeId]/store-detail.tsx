"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { updateStoreGtmAction } from "@/app/actions/admin"

interface StoreDetailProps {
  store: { id: string; name: string; slug: string; gtm_id: string | null }
  metrics: {
    totalOrders: number
    totalRevenue: number
    eventCounts: {
      view_item: number
      add_to_cart: number
      begin_checkout: number
      purchase: number
    }
    conversionRates: {
      addToCartRate: number
      checkoutRate: number
      purchaseRate: number
    }
    chartData: Array<{ date: string; pedidos: number; faturamento: number }>
  }
  adminToken: string
}

export function StoreDetail({ store, metrics, adminToken }: StoreDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "gtm">("overview")
  const [gtmValue, setGtmValue] = useState(store.gtm_id || "")
  const [gtmFeedback, setGtmFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const saveGtm = () => {
    const trimmed = gtmValue.trim()
    if (trimmed && !/^GTM-[A-Z0-9]+$/i.test(trimmed)) {
      setGtmFeedback({ type: "error", msg: "Formato inválido. Use GTM-XXXXXXX" })
      return
    }
    startTransition(async () => {
      const result = await updateStoreGtmAction(store.id, trimmed || null)
      if (result.success) {
        setGtmFeedback({ type: "success", msg: "GTM ID salvo com sucesso!" })
        setTimeout(() => setGtmFeedback(null), 3000)
      } else {
        setGtmFeedback({ type: "error", msg: result.error || "Erro ao salvar." })
      }
    })
  }

  // Gráfico simples em SVG
  const chartData = metrics.chartData.slice(-30) // últimos 30 dias
  const maxOrders = Math.max(...chartData.map((d) => d.pedidos), 1)
  const maxRevenue = Math.max(...chartData.map((d) => d.faturamento), 1)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href={`/admin?token=${adminToken}`}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-white">{store.name}</h1>
            <p className="text-xs text-zinc-500 font-mono">/{store.slug}</p>
          </div>
          <a
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-sky-400 transition-colors border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg"
          >
            Ver loja ↗
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-8 w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "overview"
                ? "bg-zinc-700 text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("gtm")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "gtm"
                ? "bg-zinc-700 text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Gerenciar GTM
          </button>
        </div>

        {/* ── ABA VISÃO GERAL ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPIs principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total de pedidos"
                value={metrics.totalOrders.toLocaleString("pt-BR")}
                color="text-sky-400"
                icon="🛍️"
              />
              <KpiCard
                label="Faturamento total"
                value={metrics.totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                color="text-emerald-400"
                icon="💰"
              />
              <KpiCard
                label="Ticket médio"
                value={
                  metrics.totalOrders > 0
                    ? (metrics.totalRevenue / metrics.totalOrders).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "R$ 0,00"
                }
                color="text-amber-400"
                icon="🎯"
              />
              <KpiCard
                label="Conv. Purchase"
                value={`${metrics.conversionRates.purchaseRate}%`}
                color="text-purple-400"
                icon="✅"
              />
            </div>

            {/* Funil de eventos de pixel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-semibold text-white mb-1">Funil de Eventos (últimos 90 dias)</h2>
              <p className="text-xs text-zinc-500 mb-5">Dados coletados via pixel nos cardápios desta loja</p>

              <div className="space-y-3">
                <FunnelRow
                  label="👁️ ViewContent"
                  sublabel="Visualizações de produto"
                  count={metrics.eventCounts.view_item}
                  max={metrics.eventCounts.view_item}
                  color="bg-sky-500"
                />
                <FunnelRow
                  label="🛒 AddToCart"
                  sublabel={`Taxa: ${metrics.conversionRates.addToCartRate}% do ViewContent`}
                  count={metrics.eventCounts.add_to_cart}
                  max={metrics.eventCounts.view_item}
                  color="bg-blue-500"
                />
                <FunnelRow
                  label="📋 InitiateCheckout"
                  sublabel={`Taxa: ${metrics.conversionRates.checkoutRate}% do AddToCart`}
                  count={metrics.eventCounts.begin_checkout}
                  max={metrics.eventCounts.view_item}
                  color="bg-violet-500"
                />
                <FunnelRow
                  label="✅ Purchase"
                  sublabel={`Taxa: ${metrics.conversionRates.purchaseRate}% do Checkout`}
                  count={metrics.eventCounts.purchase}
                  max={metrics.eventCounts.view_item}
                  color="bg-emerald-500"
                />
              </div>
            </div>

            {/* Gráfico de evolução */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-semibold text-white mb-1">Evolução de pedidos (últimos 30 dias)</h2>
              <p className="text-xs text-zinc-500 mb-5">Cada barra representa um dia</p>

              {chartData.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">
                  Ainda sem dados suficientes
                </div>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-sky-500/70 hover:bg-sky-400 rounded-sm transition-colors cursor-default"
                        style={{ height: `${Math.max(4, (d.pedidos / maxOrders) * 100)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <p className="text-zinc-300 font-medium">{d.date.slice(5)}</p>
                        <p className="text-sky-400">{d.pedidos} pedido{d.pedidos !== 1 ? "s" : ""}</p>
                        <p className="text-emerald-400">{d.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legenda datas */}
              {chartData.length > 0 && (
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-zinc-600">{chartData[0]?.date.slice(5)}</span>
                  <span className="text-xs text-zinc-600">{chartData[chartData.length - 1]?.date.slice(5)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA GERENCIAR GTM ── */}
        {activeTab === "gtm" && (
          <div className="max-w-xl space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-semibold text-white mb-1">Google Tag Manager</h2>
              <p className="text-sm text-zinc-500 mb-6">
                Configure o GTM ID desta loja. Todos os eventos de pixel serão enviados para o container correspondente.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">GTM ID</label>
                  <input
                    type="text"
                    value={gtmValue}
                    onChange={(e) => setGtmValue(e.target.value.toUpperCase())}
                    placeholder="GTM-XXXXXXX"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-sky-500/60 rounded-xl px-4 py-3 text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">Encontre no GTM em: Admin → Configurações do Container</p>
                </div>

                {gtmFeedback && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    gtmFeedback.type === "success"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {gtmFeedback.type === "success" ? "✓" : "⚠"} {gtmFeedback.msg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveGtm}
                    disabled={isPending}
                    className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {isPending ? "Salvando..." : "Salvar GTM ID"}
                  </button>
                  {gtmValue && (
                    <button
                      onClick={() => { setGtmValue(""); setGtmFeedback(null) }}
                      className="text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 px-4 py-2.5 rounded-xl text-sm transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status atual */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Status atual</h3>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${store.gtm_id ? "bg-green-400 shadow-lg shadow-green-500/30" : "bg-zinc-700"}`} />
                <div>
                  <p className="text-sm text-white">
                    {store.gtm_id ? `GTM ativo: ${store.gtm_id}` : "GTM não configurado"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {store.gtm_id
                      ? "Eventos ViewContent, AddToCart, InitiateCheckout e Purchase estão sendo enviados."
                      : "Configure um GTM ID para ativar o rastreamento."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function KpiCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-lg mb-1">{icon}</p>
      <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

function FunnelRow({
  label,
  sublabel,
  count,
  max,
  color,
}: {
  label: string
  sublabel: string
  count: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0

  return (
    <div className="flex items-center gap-4">
      <div className="w-36 shrink-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{sublabel}</p>
      </div>
      <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-zinc-300 w-12 text-right shrink-0">
        {count.toLocaleString("pt-BR")}
      </span>
    </div>
  )
}
