"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import { TermsContent } from "@/features/legal/terms-content";
import { termsService } from "@/services/terms.service";

export function ReacceptView() {
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const [accepting, setAccepting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await termsService.acceptCurrentTerms();
      toast.success("Termos aceitos. Obrigado!");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Não foi possível registrar o aceite. Tente novamente.");
      setAccepting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2">
            <Image src="/finTrackerDuo_logo.svg" alt="FinTrackerDuo" width={26} height={26} priority />
            <span className="font-bold text-sm tracking-tight">FinTrackerDuo</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            Atualizamos nossos Termos de Uso e Política de Privacidade. Para continuar
            usando o FinTrackerDuo, leia e aceite a versão vigente abaixo.
          </p>
        </div>

        <TermsContent />
      </main>

      <div className="sticky bottom-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 className="animate-spin" />
                Registrando...
              </>
            ) : (
              "Li e aceito os Termos"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
