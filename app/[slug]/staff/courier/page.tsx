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
  Package,
  ChefHat
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
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // Helper para obter o ID do entregador de forma segura
  const getCourierId = useCallback((sessData: any) => {
    if (!sessData) return null;
    return sessData.id || sessData.staffId;
  }, []);

  // 2. Busca de Pedidos
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

  // 1. Verificação de Sessão
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sess = await getStaffSession();
        
        if (!sess || sess.role !== "courier" || sess.storeSlug !== params.slug) {
          router.push(`/${params.slug}/staff`);
          return;
        }

        setSession(sess);
        const courierId = sess.id || sess.staffId; // Garante que pega o ID correto
        
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

  // 3. Lógica de Seleção (Checkbox)
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

  // 4. Ação: Sair com itens coletados (LOTE)
  const handleBatchStart = async () => {
    const courierId = getCourierId(session);

    if (selectedOrders.length === 0 || !courierId) {
      console.error("Tentativa de iniciar rota falhou. Orders:", selectedOrders.length, "ID:", courierId);
      toast({
        title: "Erro",
        description: "Sessão inválida ou nenhum pedido selecionado.",
        variant: "destructive"
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await startBatchDeliveriesAction(selectedOrders, courierId);
        
        if (result.success) {
          toast({
            title: "Rota Iniciada!",
            description: `${selectedOrders.length} pedidos foram movidos para sua lista.`,
            className: "bg-blue-600 text-white border-none"
          });
          setSelectedOrders([]);
          handleRefresh();
        } else {
          toast({
            title: "Atenção",
            description: result.message,
            variant: "destructive"
          });
          handleRefresh();
        }
      } catch (error) {
        console.error("Erro na ação de lote:", error);
        toast({ title: "Erro", description: "Falha ao processar solicitação.", variant: "destructive" });
      }
    });
  };

  // 5. Ação: Finalizar Entrega Individual
  const handleFinishDelivery = async (orderId: string) => {
    const result = await updateDeliveryStatusAction(orderId, 'entregue');
    if (result.success) {
      toast({
        title: "Entrega Concluída!",
        description: "Pedido finalizado com sucesso.",
        className: "bg-green-600 text-white border-none"
      });
      handleRefresh();
    } else {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive"
      });
    }
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
            <h1 className="font-bold text-sm leading-tight">Painel de Entregas</h1>
            <p className="text-xs text-muted-foreground">Olá, {session?.name}</p>
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
        <Tabs defaultValue="pickup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pickup" className="relative">
              A Retirar
              {readyOrders.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {readyOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Minha Rota
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ABA: A RETIRAR (COLETIVO) */}
          <TabsContent value="pickup" className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* COLUNA 1: PRONTO PARA RETIRADA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    Pronto para Retirada
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
                    <p className="text-sm text-muted-foreground">Nenhum pedido pronto.</p>
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
                                <div className="text-right">
                                  <p className="text-xs font-bold text-green-600">PRONTO</p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {calculateTimeElapsed(order.last_status_change)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-3 pl-11 text-xs space-y-1 p-4 pt-0">
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{order.address || "Endereço não informado"}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {order.items.length} itens
                              </Badge>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">R$ {Number(order.total_price).toFixed(2)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>

              {/* COLUNA 2: AGUARDANDO COZINHA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <ChefHat className="w-5 h-5" />
                    Aguardando Cozinha
                    <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                      {cookingOrders.length}
                    </Badge>
                  </h2>
                </div>

                {cookingOrders.length === 0 ? (
                  <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">A cozinha está vazia.</p>
                  </div>
                ) : (
                  cookingOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-orange-300 opacity-80 bg-slate-50 dark:bg-slate-900/50">
                      <CardHeader className="pb-2 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base text-muted-foreground">#{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{order.customer_name}</p>
                          </div>
                          <Badge variant="outline" className="bg-orange-50 text-orange-500 border-orange-200 text-[10px]">
                            PREPARANDO
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 text-xs p-4 pt-0 space-y-1">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{order.address || "Local não informado"}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-orange-600/70 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>Na cozinha há: {calculateTimeElapsed(order.last_status_change)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

            </div>
            
            {/* Espaço extra para não cobrir com o botão flutuante */}
            <div className="h-20" />
          </TabsContent>

          {/* ABA: MINHA ROTA (PRIVADO) */}
          <TabsContent value="active" className="space-y-4 max-w-md mx-auto">
            {activeOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bike className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Você não tem entregas em andamento.</p>
                <p className="text-xs mt-2">Vá na aba "A Retirar" para pegar pedidos prontos.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-blue-500 shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                        <p className="text-sm font-bold">{order.customer_name}</p>
                      </div>
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        Sua Rota
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-3 text-sm space-y-3">
                    {/* Endereço com destaque */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-start gap-3 cursor-pointer active:scale-95 transition-transform" onClick={() => openMaps(order.address || "")}>
                      <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium leading-tight">{order.address || "Sem endereço"}</p>
                        <p className="text-xs text-blue-600 mt-1 font-bold">Toque para abrir no mapa</p>
                      </div>
                    </div>

                    {/* Dados Financeiros */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                         <DollarSign className="w-4 h-4 text-green-600" />
                         <div>
                           <p className="text-xs text-muted-foreground">Total</p>
                           <p className="font-bold">R$ {Number(order.total_price).toFixed(2)}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                         <Package className="w-4 h-4 text-purple-600" />
                         <div>
                           <p className="text-xs text-muted-foreground">Pagamento</p>
                           <p className="font-bold text-xs truncate max-w-[100px]" title={order.payment_method}>
                             {formatPaymentMethod(order.payment_method)}
                           </p>
                         </div>
                      </div>
                    </div>
                    {order.change_for && (
                      <div className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-xs font-medium border border-yellow-200">
                        ⚠️ Troco para: {order.change_for}
                      </div>
                    )}
                    
                    {/* Lista rápida de itens */}
                    <div className="text-xs text-muted-foreground border-t pt-2 mt-1">
                      <p className="mb-1 font-medium">Itens:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {order.items.map((item, idx) => (
                           <li key={idx}>{item.quantity}x {item.product_name}</li>
                        ))}
                      </ul>
                    </div>

                  </CardContent>

                  <CardFooter className="grid grid-cols-[1fr_3fr] gap-2">
                    <Button variant="outline" size="icon" className="w-full" onClick={() => openWhatsApp(order.customer_phone)}>
                      <Phone className="w-5 h-5 text-green-600" />
                    </Button>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => handleFinishDelivery(order.id)}
                    >
                      <CheckCircle className="mr-2 w-5 h-5" />
                      ENTREGUE
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Botão Flutuante para Ação em Lote */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg z-50 animate-in slide-in-from-bottom-5">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1 text-sm">
              <span className="font-bold">{selectedOrders.length}</span> para retirada
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
              SAIR COM ITENS
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
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
