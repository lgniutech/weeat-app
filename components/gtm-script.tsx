"use client"

import Script from "next/script"

interface GTMScriptProps {
  gtmId: string | null | undefined
}

export function GTMScript({ gtmId }: GTMScriptProps) {
  if (!gtmId) return null

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  )
}

declare global {
  interface Window {
    dataLayer: any[]
  }
}

function pushToDataLayer(event: object) {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(event)
  }
}

async function savePixelEvent(storeId: string, eventName: string, value: number = 0) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return

    await fetch(`${supabaseUrl}/rest/v1/pixel_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ store_id: storeId, event_name: eventName, value }),
    })
  } catch {
    // Falha silenciosa
  }
}

export function trackViewContent(product: {
  id: string
  name: string
  price: number
  category?: string
}, storeId?: string) {
  pushToDataLayer({
    event: "view_item",
    ecommerce: {
      currency: "BRL",
      value: product.price,
      items: [{ item_id: product.id, item_name: product.name, item_category: product.category || "Produto", price: product.price, quantity: 1 }],
    },
  })
  if (storeId) savePixelEvent(storeId, "view_item", product.price)
}

export function trackAddToCart(item: {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
}, storeId?: string) {
  pushToDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: "BRL",
      value: item.price * item.quantity,
      items: [{ item_id: item.id, item_name: item.name, item_category: item.category || "Produto", price: item.price, quantity: item.quantity }],
    },
  })
  if (storeId) savePixelEvent(storeId, "add_to_cart", item.price * item.quantity)
}

export function trackInitiateCheckout(cartItems: Array<{
  id: string
  name: string
  price: number
  quantity: number
}>, total: number, storeId?: string) {
  pushToDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: "BRL",
      value: total,
      items: cartItems.map((item) => ({ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity })),
    },
  })
  if (storeId) savePixelEvent(storeId, "begin_checkout", total)
}

export function trackPurchase(orderId: string, cartItems: Array<{
  id: string
  name: string
  price: number
  quantity: number
}>, total: number, storeId?: string) {
  pushToDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: orderId,
      currency: "BRL",
      value: total,
      items: cartItems.map((item) => ({ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity })),
    },
  })
  if (storeId) savePixelEvent(storeId, "purchase", total)
}
