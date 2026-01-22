import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Poppins } from 'next/font/google'
// localFont removido para evitar erro de build "Module not found: Can't resolve 'next/font/local/target.css'"
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

// Configuração da fonte Poppins (Google Fonts)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-poppins',
  display: 'swap',
})

// A fonte Gate agora é carregada via CSS em app/globals.css
// Isso evita problemas de compatibilidade com o Turbopack no Next.js 16

export const metadata: Metadata = {
  title: 'DeliveryPro - Painel Administrativo',
  description: 'Gerencie seu restaurante com a melhor plataforma de delivery do mercado',
  generator: 'v0.dev',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#02B5FF',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Removemos gate.variable. A fonte Gate é aplicada via CSS global na variável --font-sans */}
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
