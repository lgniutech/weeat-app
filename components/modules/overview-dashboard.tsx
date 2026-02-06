"use client"

import { useState, useEffect, useTransition } from "react"
import { getDashboardOverviewAction, type DashboardData } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { 
  DollarSign, 
  ShoppingBag, 
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
  MapPin
} from "lucide-react"

export function OverviewDashboard({ store }: { store: any }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // --- 1. Busca de Dados do Dashboard (Polling) ---
  const loadData = () => {
    startTransition(async () => {
      const result = await getDashboardOverviewAction(store.id)
      if ('error' in result) {
        console.error(result.error)
      } else {
        setData(result)
      }
    })
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Atualiza a cada 30s
    return () => clearInterval(interval)
  }, [store.id])

  // --- 2. Busca de Clima (Prioridade: Lat/Lng Salvo > Cidade Cadastrada) ---
  useEffect(() => {
    async function fetchStoreWeather() {
        // Se não tiver nem cidade, nem lat/lng, não faz nada
        if (!store.city && !store.settings?.location?.lat) return;

        try {
            let latitude = store.settings?.location?.lat;
            let longitude = store.settings?.location?.lng;
            let cityName = store.city;

            // Se não tem Lat/Lng salvo, busca via Geocoding API usando a cidade
            if (!latitude || !longitude) {
                const query = `${store.city}, ${store.state || ''}, Brazil`;
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`
                );
                const geoData = await geoRes.json();

                if (geoData.results && geoData.results.length > 0) {
                    latitude = geoData.results[0].latitude;
                    longitude = geoData.results[0].longitude;
                    // Atualiza o nome da cidade para o oficial encontrado (opcional)
                    // cityName = geoData.results[0].name; 
                }
            }

            // Se conseguimos as coordenadas, buscamos o clima
            if (latitude && longitude) {
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
                );
                const weatherData = await weatherRes.json();

                setWeather({
                    temp: weatherData.current.temperature_2m,
                    code: weatherData.current.weather_code,
                    city: cityName
                });
            }

        } catch (error) {
            console.error("Erro ao carregar clima:", error);
        }
    }

    fetchStoreWeather();
  }, [store.city, store.state, store.settings]);

  // Helpers de Formatação
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Ícones de Clima (WMO Codes)
  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-amber-500 animate-pulse-slow" />
    if (code <= 3) return <Cloud className="w-8 h-8 text-slate-400" />
    if (code <= 48) return <Wind className="w-8 h-8 text-slate-400" />
    if (code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />
    if (code <= 77) return <Snowflake className="w-8 h-8 text-cyan-300" />
    if (code <= 82) return <CloudRain className="w-8 h-8 text-blue-600" />
    if (code <= 99) return <CloudLightning className="w-8 h-8 text-purple-500 animate-pulse" />
    return <Sun className="w-8 h-8 text-amber-500" />
  }

  const getWeatherLabel = (code: number) => {
    if (code === 0) return "Céu Limpo"
    if (code <= 3) return "Nublado"
    if (code <= 67) return "Chuvoso"
    if (code <= 99) return "Tempestade"
    return "Normal"
  }

  // Skeleton de Carregamento
  if (!data && isPending) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">Carregando cockpit...</div>
  }

  const { metrics, statusCounts, salesMix, recentOrders, unavailableProducts } = data || {
    metrics: { revenue: 0, ordersCount: 0, avgTicket: 0, cancelledCount: 0 },
    statusCounts: { pending: 0, preparing: 0, expedition: 0 },
    salesMix: [],
    recentOrders: [],
    unavailableProducts: []
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- LINHA 1: MONITOR VITAL (4 Colunas) --- */}
      <div className="grid gap-4 md:grid-cols-4">
        
        {/* KPI 1: CAIXA (2 colunas) */}
        <Card className="md:col-span-2 bg-slate-900 text-slate-50 border-slate-800 dark:bg-zinc-950 dark:border-zinc-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <DollarSign className="w-32 h-32 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Caixa Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold tracking-tight text-white mb-2">
              {formatCurrency(metrics.revenue)}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShoppingBag className="w-4 h-4" /> {metrics.ordersCount} vendas
              </span>
              <span className="w-px h-4 bg-slate-700"></span>
              <span className="text-slate-400">
                Médio: <span className="text-slate-200">{formatCurrency(metrics.avgTicket)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: CANCELAMENTOS */}
        <Card className={`${metrics.cancelledCount > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900' : 'dark:bg-zinc-900 dark:border-zinc-800'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelados</CardTitle>
            <XCircle className={`w-4 h-4 ${metrics.cancelledCount > 0 ? 'text-red-500' : 'text-slate-300'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.cancelledCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {metrics.cancelledCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">hoje</p>
          </CardContent>
        </Card>

        {/* KPI 3: CLIMA LOCAL (Endereço da Loja) */}
        <Card className="dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
             <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clima</CardTitle>
                {weather?.city && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {weather.city}</span>}
             </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0 pb-4 px-4">
             {weather ? (
               <>
                 <div className="flex flex-col">
                   <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{weather.temp.toFixed(0)}°C</span>
                   <span className="text-xs text-muted-foreground">{getWeatherLabel(weather.code)}</span>
                 </div>
                 <div className="scale-110 transform origin-center">
                    {getWeatherIcon(weather.code)}
                 </div>
               </>
             ) : (
               <div className="flex flex-col justify-center h-full w-full py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    {store.city ? "Buscando..." : "Sem endereço"}
                  </div>
                  {!store.city && <span className="text-[10px] text-red-400">Configure o endereço</span>}
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* --- LINHA 2: GARGALOS OPERACIONAIS --- */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card A: FILA */}
        <Card className={`border-l-4 ${statusCounts.pending > 0 ? 'border-l-amber-500 shadow-amber-100 dark:shadow-none' : 'border-l-slate-200'} dark:bg-zinc-900`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 ${statusCounts.pending > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              Fila de Aceite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.pending}</div>
            <p className="text-xs text-muted-foreground">aguardando confirmação</p>
          </CardContent>
        </Card>

        {/* Card B: COZINHA */}
        <Card className="border-l-4 border-l-blue-500 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Utensils className="w-4 h-4 text-blue-500" />
              Na Cozinha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.preparing}</div>
            <p className="text-xs text-muted-foreground">sendo preparados agora</p>
          </CardContent>
        </Card>

        {/* Card C: EXPEDIÇÃO */}
        <Card className="border-l-4 border-l-purple-500 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bike className="w-4 h-4 text-purple-500" />
              Em Rota / Mesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{statusCounts.expedition}</div>
            <p className="text-xs text-muted-foreground">entregando ou servindo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-7">
        
        {/* --- LINHA 3: PULSO DA LOJA (FEED) --- */}
        <Card className="md:col-span-2 lg:col-span-4 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Pulsar da Loja
            </CardTitle>
            <CardDescription>Últimas atividades em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
             <ScrollArea className="h-[300px] px-6">
                <div className="space-y-6">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">Nenhuma atividade hoje ainda.</div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="flex items-start justify-between group">
                        <div className="flex gap-3">
                          <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center border ${
                            order.delivery_type === 'delivery' ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' :
                            order.delivery_type === 'mesa' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800' :
                            'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800'
                          }`}>
                             {order.delivery_type === 'delivery' ? <Bike className="w-4 h-4"/> : 
                              order.delivery_type === 'mesa' ? <Utensils className="w-4 h-4"/> : <Store className="w-4 h-4"/>}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">
                              {order.customer_name || `Cliente #${order.id.slice(0,4)}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {order.order_items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-slate-200 dark:border-slate-700 text-slate-500">
                                  {order.status}
                                </Badge>
                                <span className="text-[10px] text-slate-400">{formatTime(order.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                             {formatCurrency(order.total_price)}
                           </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        {/* --- LINHA 3: MIX DE VENDAS & ESTOQUE --- */}
        <div className="md:col-span-1 lg:col-span-3 space-y-6">
            
            {/* Gráfico Mix */}
            <Card className="dark:bg-zinc-900 dark:border-zinc-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mix de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                    {salesMix.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesMix}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {salesMix.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => [`${value} pedidos`, '']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">Sem dados suficientes</div>
                    )}
                </CardContent>
            </Card>

            {/* Produtos Indisponíveis (Alerta de Estoque) */}
            <Card className="dark:bg-zinc-900 dark:border-zinc-800 border-l-4 border-l-red-400">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                        <PauseCircle className="w-4 h-4" />
                        Pausados / Indisponíveis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {unavailableProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Todo o cardápio está ativo.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {unavailableProducts.map(prod => (
                                <Badge key={prod.id} variant="secondary" className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50">
                                    {prod.name}
                                </Badge>
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
