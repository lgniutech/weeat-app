"use server";

import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/wasender";
import { revalidatePath } from "next/cache";

/**
 * Envia uma mensagem e registra no histórico do CRM.
 * Se o cliente não existir na tabela 'customers', ele é criado automaticamente.
 */
export async function sendMessageAction(storeId: string, customerPhone: string, message: string) {
  const supabase = await createClient();

  // 1. Segurança: Verifica se o usuário atual é dono da loja informada
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  // Verifica permissão (opcional mas recomendado para blindar a API)
  const { data: store } = await supabase.from("stores").select("owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== user.id) {
    return { error: "Sem permissão para enviar mensagens por esta loja." };
  }

  // 2. Busca o Token do Wasender
  // IDEAL: Buscar de uma tabela 'store_integrations' ou 'stores'. 
  // POR ENQUANTO: Vamos usar variável de ambiente para teste rápido.
  const token = process.env.WASENDER_TOKEN;

  if (!token) return { error: "Token do WhatsApp não configurado no sistema." };

  const cleanPhone = customerPhone.replace(/\D/g, "");
  
  // 3. Gestão do Cliente (Upsert)
  // Tenta encontrar o cliente nesta loja
  let customerId: string | null = null;

  const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .eq("phone", cleanPhone)
      .single();

  if (existingCustomer) {
      customerId = existingCustomer.id;
  } else {
      // Cria novo cliente se não existir
      const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({ 
            store_id: storeId, 
            phone: cleanPhone, 
            name: `Cliente ${cleanPhone.slice(-4)}` // Nome provisório
          })
          .select("id")
          .single();
      
      if (createError || !newCustomer) {
        console.error("Erro ao criar cliente:", createError);
        return { error: "Erro interno ao registrar cliente." };
      }
      customerId = newCustomer.id;
  }

  // 4. Envia a mensagem via API Wasender
  const apiRes = await sendWhatsAppMessage({ phone: cleanPhone, message, token });

  if (!apiRes.success) return { error: apiRes.error };

  // 5. Salva no Histórico (Tabela crm_messages)
  const { error: logError } = await supabase.from("crm_messages").insert({
      store_id: storeId,
      customer_id: customerId,
      direction: 'outbound', // Saída (Nós enviamos)
      content: message,
      status: 'sent',
      wa_message_id: apiRes.data?.messageId || null // Se a API retornar ID, salvamos
  });

  if (logError) console.error("Erro ao salvar log:", logError);

  // 6. Atualiza data da última interação (para o cliente subir no topo da lista)
  await supabase
    .from("customers")
    .update({ last_interaction_at: new Date().toISOString() })
    .eq("id", customerId);

  revalidatePath("/admin/crm");
  return { success: true };
}
