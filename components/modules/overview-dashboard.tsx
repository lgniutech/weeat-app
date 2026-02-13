"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { getDashboardOverviewAction, type DashboardData } from "@/app/actions/dashboard"
import { createClient } from "@/lib/supabase/client" // Importante para Realtime
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { 
  Activity, 
  Bike, 
  Utensils, 
  Store, 
  AlertCircle, 
  XCircle,
  PauseCircle,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  Snowflake,
  Wind,
  MapPin,
  ChefHat,
  CheckCircle2,
  Clock
} from "lucide-react"

export function OverviewDashboard({ store }: { store: any }) {
  const defaultData: DashboardData = {
    metrics: { revenue: 0, ordersCount: 0, avgTicket: 0, cancelledCount: 0 },
    statusCounts: { queue: 0, preparing: 0, ready: 0 },
    salesMix: [],
    recentOrders: [],
    unavailableProducts: []
  };

  const [data, setData] = useState<DashboardData>(defaultData)
  const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // --- 1. Busca de Dados e Realtime ---
  const loadData = useCallback(() => {
    if (!store?.id) return;
    startTransition(async () => {
      const result = await getDashboardOverviewAction(store.id)
      if ('error' in result) {
         console.error(result.error)
      } else {
        setData(result)
      }
    })
  }, [store.id])

  // Efeito de Carga Inicial + Realtime (Igual da Cozinha)
  useEffect(() => {
    loadData()
    
    // Configura Realtime para atualizar o Dashboard instantaneamente
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        () => {
          // Quando houver qualquer mudança em pedidos, recarrega os dados
          loadData()
        }
      )
      .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
  }, [loadData, store.id])

  // --- 2. Busca de Clima (Mantido original) ---
  useEffect(() => {
    async function fetchStoreWeather() {
        if (!store.city && !store.settings?.location?.lat) return;
        try {
            let latitude = store.settings?.location?.lat;
            let longitude = store.settings?.location?.lng;
            let cityName = store.city;

            if (!latitude || !longitude) {
                const query = `${store.city}, ${store.state || ''}, Brazil`;
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`);
                const geoData = await geoRes.json();
                if (geoData.results?.[0]) {
                    latitude = geoData.results[0].latitude;
                    longitude = geoData.results[0].longitude;
                }
            }

            if (latitude && longitude) {
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
                const weatherData = await weatherRes.json();
                setWeather({
                    temp: weatherData.current.temperature_2m,
                    code: weatherData.current.weather_code,
                    city: cityName
                });
            }
        } catch (error) { console.error("Erro clima:", error); }
    }
    fetchStoreWeather();
  }, [store.city, store.state, store.settings]);

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Ícones de Clima
  const getWeatherIcon = (code: number) => {
    if (code <= 1) return <Sun className="w-8 h-8 text-amber-500" />
    if (code <= 3) return <Cloud className="w-8 h-8 text-slate-400" />
    if (code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />
    if (code <= 99) return <CloudLightning className="w-8 h-8 text-purple-500" />
    return <Sun className="w-8 h-8 text-amber-500" />
  }

  const { metrics, statusCounts, salesMix, recentOrders, unavailableProducts } = data;
  const totalActiveOrders = statusCounts.queue + statusCounts.preparing + statusCounts.ready;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* LINHA 1: RESUMO VITAL */}
      <div className="grid gap-4 md:grid-cols-4">
        
        {/* KPI: PEDIDOS ATIVOS */}
        <Card className="md:col-span-2 bg-slate-900 text-white dark:bg-slate-800 border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-8 opacity-10"><Activity className="w-32 h-32" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Operação em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight mb-2">{totalActiveOrders}</div>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400" /> {statusCounts.queue} na Fila</span>
              <span className="w-px h-4 bg-slate-700"></span>
              <span className="flex items-center gap-1"><ChefHat className="w-4 h-4 text-orange-400" /> {statusCounts.preparing} no Fogo</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI: FATURAMENTO HOJE */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Hoje</CardTitle>
            <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full font-bold">
                Ticket Médio: {formatCurrency(metrics.avgTicket)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.ordersCount} pedidos finalizados/ativos</p>
          </CardContent>
        </Card>

        {/* KPI: CLIMA */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
          <CardContent className="flex items-center justify-between p-6">
             {weather ? (
               <>
                 <div>
                   <span className="text-2xl font-bold block">{weather.temp.toFixed(0)}°C</span>
                   <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/> {weather.city}</span>
                 </div>
                 <div>{getWeatherIcon(weather.code)}</div>
               </>
             ) : (
               <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin"/> Buscando clima...
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* LINHA 2: FLUXO DE PEDIDOS (ALINHADO COM A COZINHA) */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* 1. FILA (ACEITO) */}
        <Card className={`border-l-4 ${statusCounts.queue > 0 ? 'border-l-blue-500 shadow-sm' : 'border-l-slate-200'} dark:bg-zinc-900`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <AlertCircle className={`w-4 h-4 ${statusCounts.queue > 0 ? 'text-blue-500 animate-pulse' : 'text-slate-300'}`} />
              Fila de Pedidos (A Fazer)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.queue}</div>
            <p className="text-xs text-muted-foreground">aguardando início do preparo</p>
          </CardContent>
        </Card>

        {/* 2. PREPARANDO (COZINHA) */}
        <Card className={`border-l-4 ${statusCounts.preparing > 0 ? 'border-l-orange-500 shadow-sm' : 'border-l-slate-200'} dark:bg-zinc-900`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Utensils className={`w-4 h-4 ${statusCounts.preparing > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
              Em Preparo (Cozinha)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.preparing}</div>
            <p className="text-xs text-muted-foreground">sendo produzidos agora</p>
          </CardContent>
        </Card>

        {/* 3. EXPEDIÇÃO (PRONTO) */}
        <Card className={`border-l-4 ${statusCounts.ready > 0 ? 'border-l-green-500 shadow-sm' : 'border-l-slate-200'} dark:bg-zinc-900`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className={`w-4 h-4 ${statusCounts.ready > 0 ? 'text-green-500' : 'text-slate-300'}`} />
              Pronto / Expedição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.ready}</div>
            <p className="text-xs text-muted-foreground">aguardando entrega/mesa</p>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 3: DETALHES */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-7">
        
        {/* LISTA DE PEDIDOS RECENTES */}
        <Card className="md:col-span-2 lg:col-span-4 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Últimos Pedidos
            </CardTitle>
            <CardDescription>Fluxo de entrada em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
             <ScrollArea className="h-[300px] px-6">
                <div className="space-y-4 pt-2">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">Nenhum pedido hoje.</div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                            order.delivery_type === 'delivery' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            order.delivery_type === 'mesa' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                             {order.delivery_type === 'delivery' ? <Bike className="w-5 h-5"/> : 
                              order.delivery_type === 'mesa' ? <Utensils className="w-5 h-5"/> : <Store className="w-5 h-5"/>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                              {order.customer_name || (order.table_number ? `Mesa ${order.table_number}` : 'Cliente')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.order_items?.length || 0} itens • {formatTime(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(order.total_price)}</span>
                           <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase tracking-wide border-0 bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {order.status}
                           </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        {/* GRÁFICOS E ESTOQUE */}
        <div className="md:col-span-1 lg:col-span-3 space-y-6">
            <Card className="dark:bg-zinc-900 dark:border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Mix de Canais</CardTitle></CardHeader>
                <CardContent className="h-[180px]">
                    {salesMix.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={salesMix} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {salesMix.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${value} pedidos`, '']} contentStyle={{ borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
                </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900 dark:border-zinc-800 border-l-4 border-l-red-400">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400"><PauseCircle className="w-4 h-4" /> Itens Pausados</CardTitle>
                </CardHeader>
                <CardContent>
                    {unavailableProducts.length === 0 ? <p className="text-xs text-muted-foreground italic">Cardápio 100% ativo.</p> : (
                        <div className="flex flex-wrap gap-2">
                            {unavailableProducts.map((prod: any) => (
                                <Badge key={prod.id} variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-100">{prod.name}</Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
