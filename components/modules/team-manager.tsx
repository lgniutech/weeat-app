"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  getStoreStaffAction, 
  createStaffAction, 
  deleteStaffAction 
} from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ChefHat, Bike, User, ShieldCheck, Copy, ExternalLink, Check } from "lucide-react";
import Link from "next/link";

export function TeamManager({ store }: { store: any }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");
  const [hasCopied, setHasCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    role: "kitchen",
    pin: ""
  });

  useEffect(() => {
    loadStaff();
    // Pega a URL base do navegador (ex: localhost:3000 ou seu-app.vercel.app)
    setOrigin(window.location.origin);
  }, [store.id]);

  const loadStaff = async () => {
    const data = await getStoreStaffAction(store.id);
    setStaff(data);
  };

  const staffLink = `${origin}/${store.slug}/staff`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(staffLink);
    setHasCopied(true);
    toast({ title: "Copiado!", description: "Link de acesso copiado para a área de transferência." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createStaffAction(store.id, formData.name, formData.role, formData.pin);
      if (result.error) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Membro adicionado à equipe!" });
        setIsOpen(false);
        setFormData({ name: "", role: "kitchen", pin: "" });
        loadStaff();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remover este funcionário? Ele perderá o acesso imediatamente.")) return;
    await deleteStaffAction(id);
    loadStaff();
    toast({ title: "Removido", description: "Funcionário excluído." });
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'kitchen': return <ChefHat className="w-4 h-4 text-orange-500" />;
      case 'courier': return <Bike className="w-4 h-4 text-blue-500" />;
      case 'waiter': return <User className="w-4 h-4 text-emerald-500" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleName = (role: string) => {
    switch(role) {
      case 'kitchen': return 'Cozinha';
      case 'courier': return 'Entregador';
      case 'waiter': return 'Garçom';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipe & Acessos</h2>
          <p className="text-muted-foreground">Gerencie quem tem acesso ao painel operacional.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Membro
        </Button>
      </div>

      {/* NOVO: CARD DE LINK DE ACESSO */}
      <Card className="bg-slate-50 dark:bg-zinc-900 border-dashed border-primary/20">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">Portal da Equipe</h3>
                    <p className="text-xs text-muted-foreground">Envie este link para seus funcionários acessarem o sistema.</p>
                </div>
            </div>
            
            <div className="flex w-full md:w-auto items-center gap-2">
                <div className="relative w-full md:w-[300px]">
                    <Input readOnly value={staffLink} className="pr-10 bg-white dark:bg-zinc-950 font-mono text-xs" />
                </div>
                <Button size="icon" variant="outline" onClick={handleCopyLink} title="Copiar Link">
                    {hasCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Link href={`/${store.slug}/staff`} target="_blank">
                    <Button size="icon" variant="ghost" title="Abrir em nova aba">
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <Card key={member.id} className="relative group overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full">
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <CardDescription className="text-xs">{getRoleName(member.role)}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(member.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-md flex items-center justify-between border border-dashed border-slate-200 dark:border-zinc-800">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">PIN de Acesso</span>
                <span className="font-mono text-lg font-bold tracking-[0.2em]">{member.pin}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {staff.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-zinc-900/20">
             <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="font-semibold text-lg">Nenhum membro na equipe</h3>
             <p className="text-muted-foreground text-sm mb-4">Adicione cozinheiros, garçons ou entregadores.</p>
             <Button variant="outline" onClick={() => setIsOpen(true)}>Adicionar Primeiro</Button>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Membro</DialogTitle>
            <DialogDescription>Crie um acesso para seu funcionário.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Funcionário</Label>
              <Input 
                placeholder="Ex: João da Silva" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Função / Cargo</Label>
              <Select 
                value={formData.role} 
                onValueChange={val => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Cozinha (KDS)</SelectItem>
                  <SelectItem value="waiter">Garçom (Mesas)</SelectItem>
                  <SelectItem value="courier">Entregador (Delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PIN de Acesso (4 Números)</Label>
              <Input 
                placeholder="Ex: 1234" 
                maxLength={4}
                className="font-mono tracking-widest text-center text-lg"
                value={formData.pin}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, ''); // Só números
                  setFormData({...formData, pin: val});
                }}
                required
              />
              <p className="text-[10px] text-muted-foreground">Este código será usado para entrar no sistema.</p>
            </div>

            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
               <Button type="submit" disabled={isPending || formData.pin.length !== 4}>
                 {isPending ? "Salvando..." : "Criar Acesso"}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
