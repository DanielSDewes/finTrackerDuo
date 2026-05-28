import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { TermsContent } from "@/features/legal/terms-content";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso e Política de Privacidade do FinTrackerDuo.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/finTrackerDuo_logo.svg" alt="FinTrackerDuo" width={26} height={26} priority />
            <span className="font-bold text-sm tracking-tight">FinTrackerDuo</span>
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao cadastro
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <TermsContent />
      </main>
    </div>
  );
}
