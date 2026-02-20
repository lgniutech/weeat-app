"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateStoreGtmAction(
  storeId: string,
  gtmId: string | null
): Promise<{ success: boolean; error?: string }> {
  // Verifica que o token de admin está configurado (a proteção real é no page.tsx)
  if (!process.env.ADMIN_SECRET_TOKEN) {
    return { success: false, error: "Configuração inválida." }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("stores")
    .update({ gtm_id: gtmId })
    .eq("id", storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
