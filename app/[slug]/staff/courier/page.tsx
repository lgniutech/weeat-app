"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  getStaffSession, 
  logoutStaffAction 
} from "@/app/actions/staff";
import { 
  getAvailableDeliveriesAction, 
  getActiveDeliveriesAction, 
  updateDeliveryStatusAction,
  startBatchDeliveriesAction 
} from "@/app/actions/courier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Bike, 
  MapPin, 
  Phone, 
  CheckCircle, 
  LogOut, 
  RefreshCw, 
  Clock, 
  DollarSign,
  ChefHat,
  AlertTriangle
} from "lucide-react";

type OrderView = {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  payment_method: string;
  total_price: number;
  change_for: string | null;
  created_at: string;
  status: string;
  items: { quantity: number; product_name: string }[];
  last_status_change: string | null;
};

export default function CourierPage({ params }: { params: { slug: string } }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Dados Gerais
  const [availableOrders, setAvailableOrders] = useState<OrderView[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderView[]>([]);
  
  // Listas derivadas
  const readyOrders = availableOrders.filter(o => o.status === 'enviado');
  const cookingOrders = availableOrders.filter(o => o.status === 'preparando');

  // Controle de Seleção (Lote)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  // Controle de loading individual para botões
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const getCourierId = useCallback((sessData: any) => {
    if (!sessData) return null;
    return sessData.id || sessData.staffId;
  }, []);

  // Busca de Pedidos
  const fetchOrders = useCallback(async (storeId: string, courierId: string) => {
    if (!storeId || !courierId) return;
    
    startTransition(async () => {
      try {
        const [available, active] = await Promise.all([
          getAvailableDeliveriesAction(storeId),
          getActiveDeliveriesAction(storeId, courierId)
        ]);
        setAvailableOrders(available || []);
        setActiveOrders(active || []);
        
        // Limpa seleção se os pedidos não existirem mais na lista de prontos
        setSelectedOrders(prev => prev.filter(id => available?.some(o => o.id === id && o.status === 'enviado')));
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      }
    });
  }, []);

  // Verificação de Sessão
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sess = await getStaffSession();
        
        if (!sess || sess.role !== "courier" || sess.storeSlug !== params.slug) {
          router.push(`/${params.slug}/staff`);
          return;
        }

        setSession(sess);
        const courierId = sess.id || sess.staffId; 
        
        if (courierId) {
            fetchOrders(sess.storeId, courierId);
        }
      } catch (error) {
        console.error("Erro de sessão:", error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [params.slug, router, fetchOrders]);

  const handleRefresh = () => {
    const courierId = getCourierId(session);
    if (session?.storeId && courierId) {
      fetchOrders(session.storeId, courierId);
    }
  };

  const handleLogout = async () => {
    await logoutStaffAction(params.slug);
  };

  // Seleção (Lote)
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === readyOrders.length && readyOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(readyOrders.map(o => o.id));
    }
  };

  // Ação: Sair com itens coletados (LOTE)
  const handleBatchStart = async () => {
    const courierId = getCourierId(session);

    if (selectedOrders.length === 0 || !courierId) {
      toast({ title: "Erro", description: "Selecione pedidos para sair.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const result = await startBatchDeliveriesAction({
          orderIds: selectedOrders,
          courierId: String(courierId)
        });
        
        if (result.success) {
          toast({
            title: "Rota Iniciada!",
            description: "Boa entrega!",
            className: "bg-blue-600 text-white border-none"
          });
          setSelectedOrders([]);
          handleRefresh();
        } else {
          toast({ title: "Atenção", description: result.message, variant: "destructive" });
          handleRefresh();
        }
      } catch (error) {
        console.error("Erro na ação de lote:", error);
      }
    });
  };

  // Ação Rápida: Entregar
  const handleQuickFinish = async (orderId: string) => {
    setLoadingOrderId(orderId);
    
    startTransition(async () => {
      try {
        const result = await updateDeliveryStatusAction(orderId, 'entregue');
        if (result.success) {
          // Removemos localmente para dar sensação instantânea
          setActiveOrders(prev => prev.filter(o => o.id !== orderId));
          
          toast({
            title: "Entrega Finalizada!",
            className: "bg-green-600 text-white border-none duration-2000"
          });
          
          handleRefresh();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrderId(null);
      }
    });
  };

  // Utilitários
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const openMaps = (address: string) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      
      {/* Header Fixo */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Entregas</h1>
            <p className="text-xs text-muted-foreground">{session?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`w-5 h-5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="p-4 max-w-5xl mx-auto">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active">
              Minha Rota
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pickup" className="relative">
              A Retirar
              {readyOrders.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {readyOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ABA: MINHA ROTA */}
          <TabsContent value="active" className="space-y-4 max-w-md mx-auto">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bike className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="text-lg font-medium">Você está livre!</p>
                <p className="text-sm">Vá em "A Retirar" para pegar novos pedidos.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                // Removido overflow-hidden para evitar cortes no footer
                <Card key={order.id} className="border-l-4 border-l-blue-500 shadow-md">
                  <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                        <p className="text-sm font-bold">{order.customer_name}</p>
                      </div>
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        Em Rota
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="py-4 space-y-4">
                    {/* Endereço Clicável */}
                    <div 
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-lg flex items-start gap-3 cursor-pointer active:scale-95 transition-transform shadow-sm" 
                      onClick={() => openMaps(order.address || "")}
                    >
                      <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium leading-tight text-sm">{order.address || "Sem endereço"}</p>
                        <p className="text-[10px] text-blue-600 mt-1 font-bold uppercase tracking-wide">Abrir no GPS</p>
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="flex items-center justify-between text-sm px-1">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Valor Total</span>
                        <span className="font-bold text-base">R$ {Number(order.total_price).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-muted-foreground text-xs">Pagamento</span>
                        <div className="flex items-center gap-1 font-medium">
                          {order.payment_method === 'money' && <DollarSign className="w-3 h-3 text-green-600" />}
                          {formatPaymentMethod(order.payment_method)}
                        </div>
                      </div>
                    </div>

                    {/* Aviso de Troco */}
                    {order.payment_method === 'money' && order.change_for && (
                      <div className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded text-xs font-medium border border-yellow-200 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Troco para: {order.change_for}</span>
                      </div>
                    )}

                    {/* Itens */}
                    <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                      <p className="font-medium mb-1">{order.items.length} itens:</p>
                      <p className="line-clamp-2 leading-relaxed">
                        {order.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                      </p>
                    </div>
                  </CardContent>

                  {/* FOOTER COM BOTÃO ENTREGUE */}
                  <CardFooter className="flex gap-3 p-3 bg-slate-100 dark:bg-slate-800 border-t">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 shrink-0 bg-white" 
                      onClick={() => openWhatsApp(order.customer_phone)}
                    >
                      <Phone className="w-5 h-5 text-green-600" />
                    </Button>
                    
                    <Button 
                      className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-sm active:scale-95 transition-all"
                      onClick={() => handleQuickFinish(order.id)}
                      disabled={loadingOrderId === order.id}
                    >
                      {loadingOrderId === order.id ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-2 w-5 h-5" />
                          ENTREGUE
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ABA: A RETIRAR (Sem alterações de lógica, apenas layout) */}
          <TabsContent value="pickup" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PRONTO PARA RETIRADA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    Pronto
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 border-green-200">
                      {readyOrders.length}
                    </Badge>
                  </h2>
                  
                  {readyOrders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedOrders.length === readyOrders.length && readyOrders.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-xs font-medium cursor-pointer text-muted-foreground">
                        Todos
                      </label>
                    </div>
                  )}
                </div>

                {readyOrders.length === 0 ? (
                  <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">Nada pronto.</p>
                  </div>
                ) : (
                  readyOrders.map((order) => {
                    const isSelected = selectedOrders.includes(order.id);
                    return (
                      <div key={order.id} className={`transition-all duration-200 ${isSelected ? 'scale-[1.02]' : ''}`}>
                        <Card className={`border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'border-l-primary ring-2 ring-primary/20' : 'border-l-green-500'}`}
                              onClick={() => toggleOrderSelection(order.id)}
                        >
                          <CardHeader className="pb-2 flex flex-row items-start gap-3 space-y-0 p-4">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleOrderSelection(order.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">#{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                                  <p className="text-sm font-semibold">{order.customer_name}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {calculateTimeElapsed(order.last_status_change)}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-3 pl-11 text-xs space-y-1 p-4 pt-0">
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{order.address || "Local não informado"}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>

              {/* AGUARDANDO COZINHA */}
              <div className="space-y-4 opacity-75">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <ChefHat className="w-5 h-5" />
                    Cozinha
                    <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                      {cookingOrders.length}
                    </Badge>
                  </h2>
                </div>
                {cookingOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-orange-300 bg-slate-50 dark:bg-slate-900/50">
                    <CardHeader className="p-3 pb-0">
                      <div className="flex justify-between">
                        <span className="font-bold text-sm">#{order.id.slice(0, 5).toUpperCase()}</span>
                        <Badge variant="secondary" className="text-[10px]">PREPARANDO</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 text-[10px] text-muted-foreground">
                       <Clock className="w-3 h-3 inline mr-1" />
                       {calculateTimeElapsed(order.last_status_change)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="h-20" />
          </TabsContent>
        </Tabs>
      </main>

      {/* Botão Flutuante (apenas quando há seleção) */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg z-50 animate-in slide-in-from-bottom-5">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1 text-sm">
              <span className="font-bold">{selectedOrders.length}</span> selecionados
            </div>
            <Button 
              size="lg" 
              className="font-bold bg-primary text-primary-foreground shadow-xl w-2/3"
              onClick={handleBatchStart}
              disabled={isPending}
            >
              {isPending ? (
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Bike className="w-5 h-5 mr-2" />
              )}
              INICIAR ROTA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateTimeElapsed(dateString: string | null) {
  if (!dateString) return "0 min";
  const start = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diff = Math.floor((now - start) / 60000);
  if (diff < 60) return `${diff} min`;
  const hours = Math.floor(diff / 60);
  return `${hours}h ${diff % 60}m`;
}

function formatPaymentMethod(method: string) {
  const map: Record<string, string> = {
    credit_card: "Crédito",
    debit_card: "Débito",
    money: "Dinheiro",
    pix: "Pix"
  };
  return map[method] || method;
}
