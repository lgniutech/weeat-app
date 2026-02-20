"use client"

import { useState, useTransition } from "react"
import { updateStoreGtmAction } from "@/app/actions/admin"

interface Store {
  id: string
  name: string
  slug: string
  gtm_id: string | null
}

interface AdminPanelProps {
  stores: Store[]
  adminToken: string
}

export function AdminPanel({ stores: initialStores, adminToken }: AdminPanelProps) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [search, setSearch] = useState("")
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (store: Store) => {
    setEditingId(store.id)
    setEditValue(store.gtm_id || "")
    setFeedback(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  const saveGtm = (storeId: string) => {
    const trimmed = editValue.trim()

    // Validação básica do formato GTM-XXXXXXX
    if (trimmed && !/^GTM-[A-Z0-9]+$/i.test(trimmed)) {
      setFeedback({ id: storeId, type: "error", msg: "Formato inválido. Use GTM-XXXXXXX" })
      return
    }

    startTransition(async () => {
      const result = await updateStoreGtmAction(storeId, trimmed || null)
      if (result.success) {
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, gtm_id: trimmed || null } : s))
        )
        setEditingId(null)
        setFeedback({ id: storeId, type: "success", msg: "GTM ID salvo com sucesso!" })
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ id: storeId, type: "error", msg: result.error || "Erro ao salvar." })
      }
    })
  }

  const storesWithGtm = stores.filter((s) => s.gtm_id).length

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-white leading-none">Painel Admin</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Gerenciamento de Pixels & GTM</p>
            </div>
          </div>
          <a
            href={`/admin?token=${adminToken}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            weeat.com.br
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stores.length}</p>
            <p className="text-sm text-zinc-500 mt-0.5">Lojas cadastradas</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{storesWithGtm}</p>
            <p className="text-sm text-zinc-500 mt-0.5">Com GTM ativo</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-yellow-400">{stores.length - storesWithGtm}</p>
            <p className="text-sm text-zinc-500 mt-0.5">Sem GTM</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_200px_120px] gap-4 px-6 py-3 bg-zinc-800/50 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Loja</span>
            <span>Slug / URL</span>
            <span>GTM ID</span>
            <span>Ações</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-600">
              Nenhuma loja encontrada.
            </div>
          ) : (
            filtered.map((store) => (
              <div
                key={store.id}
                className="grid grid-cols-[1fr_1fr_200px_120px] gap-4 px-6 py-4 border-b border-zinc-800/60 last:border-0 items-center hover:bg-zinc-800/20 transition-colors"
              >
                {/* Name */}
                <div>
                  <p className="font-medium text-white text-sm">{store.name}</p>
                </div>

                {/* Slug */}
                <div>
                  <a
                    href={`/${store.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-primary transition-colors font-mono"
                  >
                    /{store.slug} ↗
                  </a>
                </div>

                {/* GTM ID - editing or display */}
                <div>
                  {editingId === store.id ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                        placeholder="GTM-XXXXXXX"
                        autoFocus
                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-primary/60 rounded-lg px-3 py-1.5 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGtm(store.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      {feedback?.id === store.id && (
                        <p className={`text-xs ${feedback.type === "error" ? "text-red-400" : "text-green-400"}`}>
                          {feedback.msg}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {store.gtm_id ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-xs font-mono text-zinc-300">{store.gtm_id}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                          <span className="text-xs text-zinc-600 italic">Não configurado</span>
                        </>
                      )}
                      {feedback?.id === store.id && feedback.type === "success" && (
                        <span className="text-xs text-green-400">✓</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {editingId === store.id ? (
                    <>
                      <button
                        onClick={() => saveGtm(store.id)}
                        disabled={isPending}
                        className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        {isPending ? "..." : "Salvar"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(store)}
                      className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {store.gtm_id ? "Editar" : "Adicionar"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-zinc-700 mt-6">
          Acesse via <code className="text-zinc-600">/admin?token=SEU_TOKEN</code> · Os eventos rastreados são: ViewContent, AddToCart, InitiateCheckout, Purchase
        </p>
      </main>
    </div>
  )
}
