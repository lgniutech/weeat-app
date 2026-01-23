import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StoreSettingsForm from "./store-settings-form"; // Vamos criar esse componente abaixo
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function StoreSettingsPage() {
  const supabase = await createClient();

  // 1. Validar Usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Buscar dados da loja
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/");

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário";

  // Renderizamos a Sidebar aqui também para manter o layout, mas focados no conteúdo
  return (
    <SidebarProvider>
      <AppSidebar 
        activeModule="configuracoes" 
        onModuleChange={() => {}} 
        storeName={store.name}
        storeLogo={store.logo_url}
        userName={userName}
        userEmail={user.email || ""}
      />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/10 min-h-screen">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dados da Loja</h1>
              <p className="text-muted-foreground">Atualize as informações e o visual do seu negócio.</p>
            </div>
            
            {/* Componente Client-Side do Formulário */}
            <StoreSettingsForm store={store} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
