import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { getStoreMetricsAction } from "@/app/actions/admin"
import { StoreDetail } from "./store-detail"

export default async function AdminStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { storeId } = await params
  const { token } = await searchParams
  const adminToken = process.env.ADMIN_SECRET_TOKEN

  if (!adminToken || token !== adminToken) {
    redirect(`/admin`)
  }

  const supabase = await createClient()
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, gtm_id")
    .eq("id", storeId)
    .maybeSingle()

  if (!store) return notFound()

  const metrics = await getStoreMetricsAction(storeId)

  return <StoreDetail store={store} metrics={metrics} adminToken={adminToken} />
}
