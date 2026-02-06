"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  getCouponsAction, 
  saveCouponAction, 
  deleteCouponAction, 
  toggleCouponStatusAction,
  type Coupon 
} from "@/app/actions/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Ticket, Plus, Trash2, Calendar, DollarSign, Percent, Loader2, Edit2 } from "lucide-react";

export function CouponsManager({ store }: { store: any }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Estado do Formulário
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    type: "percent",
    value: "",
    minOrder: "",
    maxUses: "",
    expiresAt: ""
  });

  useEffect(() => {
    loadCoupons();
  }, [store.id]);

  const loadCoupons = async () => {
    const data = await getCouponsAction(store.id);
    setCoupons(data);
  };

  const handleOpen = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.discount_type,
        value: coupon.discount_value.toString(),
        minOrder: coupon.min_order_value > 0 ? coupon.min_order_value.toString() : "",
        maxUses: coupon.max_uses ? coupon.max_uses.toString() : "",
        expiresAt: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : ""
      });
    } else {
      setEditingCoupon(null);
      setFormData({ code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const data = new FormData();
      if (editingCoupon) data.append("id", editingCoupon.id);
      data.append("code", formData.code);
      data.append("type", formData.type);
      data.append("value", formData.value);
      data.append("minOrder", formData.minOrder);
      data.append("maxUses", formData.maxUses);
      data.append("expiresAt", formData.expiresAt);

      const result = await saveCouponAction(data, store.id);
      
      if (result.error) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Cupom salvo com sucesso!" });
        setIsOpen(false);
        loadCoupons();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    await deleteCouponAction(id);
    loadCoupons();
    toast({ title: "Excluído", description: "Cupom removido." });
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    await toggleCouponStatusAction(id, !currentStatus);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cupons de Desconto</h2>
          <p className="text-muted-foreground">Crie códigos promocionais para seus clientes.</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cupom
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div 
            key={coupon.id} 
            className={`relative group flex flex-col justify-between border rounded-lg p-5 transition-all hover:shadow-md ${
              coupon.is_active ? "bg-card border-border" : "bg-slate-50 dark:bg-zinc-900/50 border-slate-100 opacity-75"
            }`}
          >
            {/* Decoração Visual de "Rasgo" do Ticket */}
            <div className="absolute -left-2 top-1/2 -mt-2 w-4 h-4 rounded-full bg-background border-r border-border" />
            <div className="absolute -right-2 top-1/2 -mt-2 w-4 h-4 rounded-full bg-background border-l border-border" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant={coupon.is_active ? "default" : "secondary"} className={coupon.is_active ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                  {coupon.is_active ? "ATIVO" : "INATIVO"}
                </Badge>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpen(coupon)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(coupon.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter">
                  {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">OFF</span>
              </div>
              
              <div className="bg-slate-100 dark:bg-zinc-800 p-2 rounded border border-dashed border-slate-300 dark:border-zinc-700 mt-3 text-center">
                {/* REMOVIDO: font-mono */}
                <span className="font-bold text-lg tracking-widest uppercase">{coupon.code}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-dashed space-y-2 text-xs text-muted-foreground">
              {coupon.min_order_value > 0 && (
                <div className="flex justify-between">
                  <span>Mínimo:</span>
                  <span className="font-medium">{formatCurrency(coupon.min_order_value)}</span>
                </div>
              )}
              {coupon.max_uses && (
                <div className="flex justify-between">
                  <span>Usos:</span>
                  <span className="font-medium">{coupon.used_count} / {coupon.max_uses}</span>
                </div>
              )}
              {coupon.expires_at && (
                <div className="flex justify-between text-amber-600 dark:text-amber-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Expira:</span>
                  <span>{new Date(coupon.expires_at).toLocaleDateString()}</span>
                </div>
              )}
              <div className="pt-2 flex items-center justify-between">
                <span>Status:</span>
                <Switch 
                  checked={coupon.is_active} 
                  onCheckedChange={(c) => handleToggle(coupon.id, !c)} 
                />
              </div>
            </div>
          </div>
        ))}
        
        {coupons.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
             <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="font-semibold text-lg">Nenhum cupom ativo</h3>
             <p className="text-muted-foreground text-sm mb-4">Crie sua primeira campanha de desconto.</p>
             <Button onClick={() => handleOpen()}>Criar Cupom</Button>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            <DialogDescription>Configure as regras da promoção.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código do Cupom</Label>
                {/* REMOVIDO: font-mono */}
                <Input 
                  id="code" 
                  placeholder="Ex: BEMVINDO10" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="uppercase font-bold tracking-wider" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={val => setFormData({...formData, type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor do Desconto</Label>
              <div className="relative">
                 {formData.type === 'fixed' ? (
                   <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 ) : (
                   <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 )}
                 <Input 
                   id="value" 
                   type="number" 
                   step="0.01" 
                   className="pl-9" 
                   placeholder={formData.type === 'percent' ? "Ex: 10 (para 10%)" : "Ex: 15.00"}
                   value={formData.value}
                   onChange={e => setFormData({...formData, value: e.target.value})}
                   required
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="minOrder">Pedido Mínimo (R$)</Label>
                 <Input 
                    id="minOrder" 
                    type="number" 
                    placeholder="Opcional"
                    value={formData.minOrder}
                    onChange={e => setFormData({...formData, minOrder: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="maxUses">Limite de Usos</Label>
                 <Input 
                    id="maxUses" 
                    type="number" 
                    placeholder="Ilimitado"
                    value={formData.maxUses}
                    onChange={e => setFormData({...formData, maxUses: e.target.value})}
                 />
               </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="expiresAt">Validade (Opcional)</Label>
                <Input 
                    id="expiresAt" 
                    type="datetime-local" 
                    value={formData.expiresAt}
                    onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                 />
            </div>

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
               <Button type="submit" disabled={isPending}>
                 {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                 Salvar Cupom
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
