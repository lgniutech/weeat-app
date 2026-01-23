import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StoreSettingsForm from "./store-settings-form";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function StoreSettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Correção aqui: maybeSingle() evita o crash se não houver dados
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!store) redirect("/");

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || "Usuário";

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
              <p className="text-muted-foreground">Atualize as informações do seu negócio.</p>
            </div>
            <StoreSettingsForm store={store} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
