"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const storeSchema = z.object({
  ownerName: z.string().min(3, "Seu nome deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"), // Novo campo
  name: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido").optional().or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido"),
})

export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  const ownerName = formData.get("ownerName") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const cnpj = formData.get("cnpj") as string
  const phone = formData.get("phone") as string

  // Validação
  const result = storeSchema.safeParse({ ownerName, password, name, cnpj, phone })
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // 1. Atualiza o usuário (Nome e SENHA)
  const { error: updateUserError } = await supabase.auth.updateUser({
    password: result.data.password, // Define a senha que ele escolheu
    data: { full_name: result.data.ownerName }
  })

  if (updateUserError) {
    return { error: "Erro ao salvar sua senha/nome. Tente novamente." }
  }

  // 2. Cria a loja
  const cleanName = name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
  const autoSlug = `${cleanName}-${Math.floor(Math.random() * 10000)}`

  const { error } = await supabase.from("stores").insert({
    user_id: user.id,
    name: result.data.name,
    slug: autoSlug,
    cnpj: result.data.cnpj,
    phone: result.data.phone
  })

  if (error) {
    console.error(error)
    return { error: "Erro ao criar loja. Tente novamente." }
  }

  revalidatePath("/")
  return { success: true }
}
