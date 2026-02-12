"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  getStaffSession, 
  logoutStaffAction 
} from "@/app/actions/staff";
import { 
  getAvailableDeliveriesAction, 
  getActiveDeliveriesAction, 
  updateDeliveryStatusAction 
} from "@/app/actions/courier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Package
} from "lucide-react";

// Tipagem básica para o pedido na view
type OrderView = {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  payment_method: string;
  total_price: number;
  change_for: string | null;
  created_at: string;
  items: { quantity: number; product_name: string }[];
};

export default function CourierPage({ params }: { params: { slug: string } }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<OrderView[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderView[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // 1. Verificação de Sessão
  useEffect(() => {
    const checkSession = async () => {
      const sess = await getStaffSession();
      if (!sess || sess.role !== "courier" || sess.storeSlug !== params.slug) {
        router.push(`/${params.slug}/staff`);
        return;
      }
      setSession(sess);
      fetchOrders(sess.storeId);
      setLoading(false);
    };
    checkSession();
  }, [params.slug, router]);

  // 2. Busca de Pedidos
  const fetchOrders = async (storeId: string) => {
    startTransition(async () => {
      const [available, active] = await Promise.all([
        getAvailableDeliveriesAction(storeId),
        getActiveDeliveriesAction(storeId)
      ]);
      setAvailableOrders(available);
      setActiveOrders(active);
    });
  };

  const handleRefresh = () => {
    if (session?.storeId) fetchOrders(session.storeId);
  };

  const handleLogout = async () => {
    await logoutStaffAction(params.slug);
  };

  // 3. Ações de Mudança de Status
  const handleStatusChange = async (orderId: string, newStatus: 'em_rota' | 'entregue') => {
    const result = await updateDeliveryStatusAction(orderId, newStatus);
    if (result.success) {
      toast({
        title: newStatus === 'em_rota' ? "Saiu para entrega!" : "Entrega concluída!",
        description: "Lista atualizada com sucesso.",
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

  // Utilitários de Link
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const openMaps = (address: string) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    // Tenta abrir app nativo ou fallback web
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      
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
      <main className="p-4 max-w-md mx-auto">
        <Tabs defaultValue="pickup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pickup" className="relative">
              A Retirar
              {availableOrders.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {availableOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Em Rota
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ABA: A RETIRAR */}
          <TabsContent value="pickup" className="space-y-4">
            {availableOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum pedido aguardando retirada.</p>
              </div>
            ) : (
              availableOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-orange-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 5).toUpperCase()}</CardTitle>
                        <p className="text-sm text-muted-foreground font-medium">{order.customer_name}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                        Aguardando
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{order.address || "Endereço não informado"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>Pronto há: {calculateTimeElapsed(order.last_status_change)}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full font-bold" 
                      onClick={() => handleStatusChange(order.id, 'em_rota')}
                    >
                      <Bike className="mr-2 w-4 h-4" />
                      SAIR PARA ENTREGA
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ABA: EM ROTA */}
          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bike className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma entrega em andamento.</p>
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
                        Em Rota
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
                           <p className="text-xs text-muted-foreground">Valor Total</p>
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

                    {/* Troco se necessário */}
                    {order.change_for && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded text-xs font-medium border border-yellow-200 dark:border-yellow-900/50">
                        ⚠️ Troco para: {order.change_for}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="grid grid-cols-[1fr_3fr] gap-2">
                    <Button variant="outline" size="icon" className="w-full" onClick={() => openWhatsApp(order.customer_phone)}>
                      <Phone className="w-5 h-5 text-green-600" />
                    </Button>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => handleStatusChange(order.id, 'entregue')}
                    >
                      <CheckCircle className="mr-2 w-5 h-5" />
                      FINALIZAR
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
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
