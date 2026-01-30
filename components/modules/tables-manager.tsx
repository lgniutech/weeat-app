"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Printer, ExternalLink, Copy, CheckCircle, Save, Loader2 } from "lucide-react"
import { updateStoreTablesAction } from "@/app/actions/store"

export function TablesManager({ store }: { store: any }) {
  const [tableCount, setTableCount] = useState(store.total_tables || 10)
  const [isPending, startTransition] = useTransition()
  
  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/${store.slug}`
    }
    return ""
  }

  const generateTableLink = (tableNum: number) => {
    return `${getBaseUrl()}?mesa=${tableNum}`
  }

  const handleSave = () => {
      startTransition(async () => {
          const res = await updateStoreTablesAction(tableCount)
          if (res?.error) { alert(res.error) } 
      })
  }

  const handlePrintQrs = () => {
    const w = window.open('', '_blank')
    if (!w) return

    const tablesHtml = Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
      const url = generateTableLink(num)
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`
      
      return `
        <div class="card">
            <div class="title">MESA ${num}</div>
            <img src="${qrApi}" alt="Mesa ${num}" />
            <div class="store-name">${store.name}</div>
            <div class="footer">Aponte a câmera para pedir</div>
        </div>
      `
    }).join('')

    w.document.write(`
      <html>
      <head>
        <title>QR Codes - ${store.name}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; text-align: center; }
          .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
          .card { 
            border: 2px solid #000; 
            border-radius: 10px; 
            padding: 20px; 
            width: 160px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          .title { font-size: 24px; font-weight: 900; margin-bottom: 10px; }
          .store-name { margin-top: 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; }
          .footer { font-size: 10px; margin-top: 5px; color: #555; }
          img { width: 140px; height: 140px; }
          @media print { .no-print { display: none; } .card { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; padding: 20px; background: #f0f0f0; border-radius: 8px;">
            <p>🖨️ Para imprimir, clique no botão abaixo.</p>
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">IMPRIMIR AGORA</button>
        </div>
        <div class="grid">${tablesHtml}</div>
      </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Mesas</h2>
        <p className="text-muted-foreground">
          Configure a quantidade de mesas e imprima os QR Codes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* Configuração */}
         <Card className="md:col-span-1 h-fit">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><QrCode className="w-5 h-5"/> Configuração</CardTitle>
                <CardDescription>Quantas mesas seu estabelecimento possui?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Quantidade de Mesas</Label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            min={1} 
                            max={200} 
                            value={tableCount} 
                            onChange={(e) => setTableCount(parseInt(e.target.value) || 1)} 
                            className="flex-1"
                        />
                        <Button onClick={handleSave} disabled={isPending} className="w-[100px]">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar
                        </Button>
                    </div>
                </div>
                
                <div className="pt-4 border-t dark:border-zinc-800">
                    <Button onClick={handlePrintQrs} variant="outline" className="w-full">
                        <Printer className="mr-2 w-4 h-4"/> Gerar PDF para Impressão
                    </Button>
                </div>
            </CardContent>
         </Card>

         {/* Preview / Tutorial */}
         <Card className="md:col-span-2 bg-slate-50 dark:bg-zinc-900 border-dashed dark:border-zinc-800">
            <CardHeader>
                <CardTitle className="text-lg text-foreground">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                        <p><strong className="text-slate-900 dark:text-slate-200">1. Defina e Salve:</strong><br/>Informe quantas mesas existem e salve.</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">2. Imprima:</strong><br/>Gere o PDF com as etiquetas.</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">3. Cole na Mesa:</strong><br/>O cliente aponta a câmera e o cardápio abre na Mesa correta.</p>
                    </div>
                    
                    <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold uppercase text-slate-400 mb-2">Exemplo Visual</span>
                        <div className="border-2 border-black dark:border-white rounded p-3 w-[120px] h-[140px] flex flex-col items-center opacity-80 bg-white text-black">
                            <span className="font-black text-sm">MESA 1</span>
                            <div className="bg-slate-200 w-16 h-16 my-2"></div>
                            <span className="text-[6px] uppercase">{store.name}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 border dark:border-zinc-800 rounded-lg bg-white dark:bg-black">
                    <Label className="text-xs text-muted-foreground mb-1 block">Teste o link da Mesa 1:</Label>
                    <div className="flex items-center gap-2">
                        <code className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs flex-1 truncate text-slate-700 dark:text-slate-300">
                            {typeof window !== 'undefined' ? generateTableLink(1) : '...'}
                        </code>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(generateTableLink(1)); alert("Link copiado!") }}>
                            <Copy className="w-3 h-3"/>
                        </Button>
                         <a href={generateTableLink(1)} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="w-3 h-3"/>
                            </Button>
                        </a>
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
