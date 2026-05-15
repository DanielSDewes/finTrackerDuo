import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "FinTracker — Controle Financeiro para Casais",
    template: "%s | FinTracker",
  },
  description:
    "Plataforma moderna de controle financeiro pessoal e compartilhado para casais. Gerencie entradas, saídas, investimentos e metas financeiras.",
  keywords: [
    "controle financeiro",
    "finanças pessoais",
    "finanças para casais",
    "investimentos",
    "metas financeiras",
    "dashboard financeiro",
  ],
  authors: [{ name: "FinTracker" }],
  creator: "FinTracker",
  icons: {
    icon: "/iconeSite.png",
    shortcut: "/iconeSite.png",
    apple: "/iconeSite.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "FinTracker — Controle Financeiro para Casais",
    description: "Organize suas finanças pessoais e do casal em uma plataforma moderna.",
    siteName: "FinTracker",
    images: [
      {
        url: "/iconeSite.png",
        alt: "finTrackerDuo — Controle Financeiro para Casais",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FinTracker",
    description: "Controle financeiro inteligente para casais",
    images: ["/iconeSite.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontFamily: "var(--font-geist-sans)",
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
