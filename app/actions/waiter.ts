"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied';

export type TableData = {
  id: string;
  status: TableStatus;
  orderId?: string;
  customerName?: string;
  total: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  items?: any[];
  orderStatus?: string;
  hasReadyItems: boolean;
  readyOrderIds: string[];
  isPreparing: boolean;
};

// --- HELPER: CALCULAR DESCONTO (Privado) ---
async function calculateDiscount(supabase: any, storeId: string, grossTotal: number, code: string) {
    if (!code) return { discount: 0, code: null, error: null };

    const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("store_id", storeId)
        .eq("code", code)
        .eq("is_active", true)
        .single();

    if (!coupon) return { discount: 0, code: null, error: "Cupom inválido" };
    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) return { discount: 0, code: null, error: "Cupom não vigente" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { discount: 0, code: null, error: "Cupom expirado" };
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return { discount: 0, code: null, error: "Esgotado" };
    if (grossTotal < coupon.min_order_value) return { discount: 0, code: null, error: `Mínimo: R$ ${coupon.min_order_value}` };

    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
        discountAmount = (grossTotal * coupon.discount_value) / 100;
    } else {
        discountAmount = coupon.discount_value;
    }

    if (discountAmount > grossTotal) discountAmount = grossTotal;

    return { discount: discountAmount, code: code, error: null, couponId: coupon.id };
}

// --- 1. BUSCAR STATUS ---
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  const { data: store } = await supabase.from("stores").select("total_tables").eq("id", storeId).single();
  const totalTables = store?.total_tables || 10; 

  // Buscamos pedidos ativos (não concluídos e não cancelados)
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, status, total_price, discount, coupon_code, address, customer_name, table_number,
      order_items ( id, name:product_name, quantity, price:unit_price, send_to_kitchen, status )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "concluido") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    const tableOrders = activeOrders?.filter(o => 
       o.table_number === tableNum || (o.address && o.address.replace(/\D/g, '') === tableNum)
    ) || [];
    
    // Filtro de itens prontos DA COZINHA (status do pedido 'enviado' pela cozinha)
    const readyOrders = tableOrders.filter(o => o.status === 'enviado');
    
    // Mesa está "preparando" se tiver algum pedido aceito/preparando
    const isPreparing = tableOrders.some(o => ['aceito', 'preparando'].includes(o.status));
    
    let status: TableStatus = 'free';
    if (tableOrders.length > 0) status = 'occupied';

    const total = tableOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const totalDiscount = tableOrders.reduce((acc, o) => acc + (o.discount || 0), 0);
    const activeCoupon = tableOrders.find(o => o.coupon_code)?.coupon_code;
    const subtotal = total + totalDiscount;
    // Flat map de todos os itens da mesa
    const allItems = activeOrders?.filter(o => o.table_number === tableNum).flatMap(o => o.order_items || []) || [];

    return {
      id: tableNum,
      status: status,
      orderId: tableOrders[0]?.id,
      customerName: tableOrders[0]?.customer_name,
      total: total,
      subtotal: subtotal,
      discount: totalDiscount,
      couponCode: activeCoupon,
      items: allItems,
      orderStatus: tableOrders[0]?.status,
      hasReadyItems: readyOrders.length > 0,
      readyOrderIds: readyOrders.map(o => o.id),
      isPreparing: isPreparing
    };
  });

  return tables;
}

// --- 2. MENU ---
export async function getWaiterMenuAction(storeId: string) {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, name, products (
        id, name, price, description, is_available, category_id, image_url, send_to_kitchen,
        product_ingredients (ingredient:ingredients (id, name)),
        product_addons (price, addon:addons (id, name))
      )
    `)
    .eq("store_id", storeId)
    .order("index", { ascending: true });

  if (!categories) return [];
  return categories.map(cat => ({
    ...cat,
    products: cat.products?.filter((p: any) => p.is_available).map((p: any) => ({
        ...p,
        ingredients: p.product_ingredients?.map((pi: any) => pi.ingredient).filter(Boolean) || [],
        addons: p.product_addons?.map((pa: any) => ({ ...pa.addon, price: pa.price })).filter((a: any) => a.id) || []
    }))
  })).filter(cat => cat.products.length > 0);
}

// --- 3. CRIAR PEDIDO (COM CUPOM) ---
export async function createTableOrderAction(
    storeId: string, 
    tableNum: string, 
    items: any[], 
    clientName?: string, 
    clientPhone?: string,
    couponCode?: string
) {
  const supabase = await createClient();
  try {
      const itemsTotal = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      
      let discount = 0;
      let finalCouponCode = null;
      
      if (couponCode && couponCode.trim() !== "") {
          const res = await calculateDiscount(supabase, storeId, itemsTotal, couponCode.toUpperCase());
          if (res.error) return { error: res.error };
          discount = res.discount;
          finalCouponCode = res.code;
          
          if(res.couponId) await supabase.rpc('increment_coupon_usage', { coupon_id: res.couponId });
      }

      const finalTotal = itemsTotal - discount;
      const finalName = clientName && clientName.trim() !== "" ? clientName : `Mesa ${tableNum}`;
      const finalPhone = clientPhone && clientPhone.trim() !== "" ? clientPhone : "00000000000";

      const { data: order, error } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: finalName,
        customer_phone: finalPhone, 
        delivery_type: "mesa",
        address: `Mesa ${tableNum}`,
        table_number: tableNum,
        payment_method: "card_machine",
        status: "aceito", 
        total_price: finalTotal,
        discount: discount,         
        coupon_code: finalCouponCode,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (error) return { error: error.message };

      if (items.length > 0) {
          const orderItems = items.map(i => ({
            order_id: order.id,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: (i.totalPrice || i.price * i.quantity),
            observation: i.observation || "",
            removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
            selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null,
            status: 'aceito',
            send_to_kitchen: i.send_to_kitchen !== undefined ? i.send_to_kitchen : (i.sendToKitchen !== undefined ? i.sendToKitchen : true)
          }));
          await supabase.from("order_items").insert(orderItems);
      }
      
      await supabase.from("order_history").insert({ order_id: order.id, new_status: 'aceito' });
      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) { return { error: "Erro interno." }; }
}

// --- 4. ADICIONAR ITENS (COM CUPOM) ---
export async function addItemsToTableAction(
    orderId: string, 
    newItems: any[], 
    currentTableTotal: number, 
    couponCode?: string
) {
  const supabase = await createClient();
  try {
      const addedItemsTotal = newItems.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      
      const orderItems = newItems.map(i => ({
        order_id: orderId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: (i.totalPrice || i.price * i.quantity),
        observation: i.observation || "",
        removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
        selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null,
        status: 'aceito',
        send_to_kitchen: i.send_to_kitchen !== undefined ? i.send_to_kitchen : (i.sendToKitchen !== undefined ? i.sendToKitchen : true)
      }));
      await supabase.from("order_items").insert(orderItems);
      
      const { data: currentOrder } = await supabase.from("orders").select("total_price, discount").eq("id", orderId).single();
      
      if (!currentOrder) return { error: "Pedido não encontrado" };

      const previousGross = currentOrder.total_price + (currentOrder.discount || 0);
      const newGrossTotal = previousGross + addedItemsTotal;

      let discount = currentOrder.discount || 0;
      let finalCouponCode = null; 

      if (couponCode && couponCode.trim() !== "") {
          const { data: store } = await supabase.from("orders").select("store_id").eq("id", orderId).single();
          const res = await calculateDiscount(supabase, store.store_id, newGrossTotal, couponCode.toUpperCase());
          if (res.error) return { error: res.error };
          
          discount = res.discount;
          finalCouponCode = res.code;
          if(res.couponId) await supabase.rpc('increment_coupon_usage', { coupon_id: res.couponId });
      }

      await supabase.from("orders")
        .update({ 
            total_price: newGrossTotal - discount,
            discount: discount,
            ...(finalCouponCode ? { coupon_code: finalCouponCode } : {}),
            status: "aceito", 
            last_status_change: new Date().toISOString() 
        })
        .eq("id", orderId);

      revalidatePath("/");
      return { success: true };
  } catch (err) { return { error: "Erro ao processar." }; }
}

// --- 5. VALIDAR CUPOM ---
export async function validateCouponUiAction(storeId: string, code: string, currentAmount: number) {
    const supabase = await createClient();
    const res = await calculateDiscount(supabase, storeId, currentAmount, code);
    if(res.error) return { valid: false, message: res.error };
    return { valid: true, discount: res.discount, finalPrice: currentAmount - res.discount };
}

// --- 6. FECHAR MESA ---
export async function closeTableAction(tableNum: string, storeId: string, isForced: boolean = false) {
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders")
      .select("id")
      .eq("store_id", storeId)
      .eq("table_number", tableNum)
      .neq("status", "concluido") 
      .neq("status", "cancelado");

  if (!orders || orders.length === 0) return { success: true };
  const ids = orders.map(o => o.id);

  const newStatus = isForced ? "cancelado" : "concluido";
  const paymentMethod = isForced ? "nao_pago" : "card_machine";
  const cancelReason = isForced ? "Desistência (Fechamento forçado via PIN)" : null;

  await supabase.from("orders")
      .update({ 
          status: newStatus, 
          payment_method: paymentMethod, 
          cancellation_reason: cancelReason,
          last_status_change: new Date().toISOString() 
      })
      .in("id", ids);

  await supabase.from("order_items")
      .update({ status: newStatus })
      .in("order_id", ids);

  revalidatePath("/");
  return { success: true };
}

// --- 7. SERVIR PEDIDOS DA COZINHA (EM BLOCO) ---
export async function serveReadyOrdersAction(orderIds: string[]) {
    const supabase = await createClient();
    await supabase.from("orders").update({ status: "entregue", last_status_change: new Date().toISOString() }).in("id", orderIds);
    revalidatePath("/");
    return { success: true };
}

// --- 8. SERVIR ITENS DE BAR (INDIVIDUALMENTE) E ATUALIZAR PEDIDO ---
export async function serveBarItemsAction(itemIds: string[]) {
    // 1. Validação de Entrada
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return { success: false, error: "IDs inválidos." };
    }

    const supabase = await createClient();

    try {
        // 2. Busca IDs de Pedidos
        const { data: itemsData, error: fetchError } = await supabase
            .from("order_items")
            .select("order_id")
            .in("id", itemIds);

        if (fetchError) {
            console.error("Erro ao buscar itens:", fetchError);
            return { success: false, error: "Erro ao localizar itens." };
        }

        if (!itemsData || itemsData.length === 0) {
             return { success: false, error: "Nenhum item encontrado." };
        }

        const uniqueOrderIds = [...new Set(itemsData.map(i => i.order_id))];

        // 3. Atualiza Itens
        const { error: updateError } = await supabase
            .from("order_items")
            .update({ status: 'entregue' })
            .in("id", itemIds);
        
        if (updateError) {
            console.error("Erro ao atualizar itens:", updateError);
            return { success: false, error: "Falha ao atualizar status." };
        }

        // 4. Verifica Pedidos Pai
        for (const orderId of uniqueOrderIds) {
            const { count } = await supabase
                .from("order_items")
                .select("*", { count: 'exact', head: true })
                .eq("order_id", orderId)
                .neq("status", "entregue")
                .neq("status", "concluido")
                .neq("status", "cancelado");
            
            if (count === 0) {
                await supabase
                    .from("orders")
                    .update({ status: 'entregue', last_status_change: new Date().toISOString() })
                    .eq("id", orderId);
            }
        }

        revalidatePath("/");
        return { success: true };

    } catch (err) {
        console.error("Erro inesperado no servidor:", err);
        return { success: false, error: "Erro inesperado ao processar." };
    }
}
