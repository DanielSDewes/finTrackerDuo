import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "finTrackerDuo",
  description: "Acesse sua conta ou crie uma nova",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — sempre escuro, oculto em mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#08090e] flex-col p-10 text-white overflow-hidden">

        {/* Círculos decorativos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-20 w-[520px] h-[520px] rounded-full border border-[hsl(var(--primary)/0.12)]" />
          <div className="absolute top-1/3 -right-40 w-[380px] h-[380px] rounded-full border border-[hsl(var(--primary)/0.07)]" />
          <div className="absolute -bottom-24 -left-28 w-[440px] h-[440px] rounded-full border border-[hsl(var(--primary)/0.10)]" />
          <div className="absolute bottom-1/3 left-1/4 w-[260px] h-[260px] rounded-full border border-[hsl(var(--primary)/0.06)]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <Image src="/finTrackerDuo_logo.svg" alt="finTrackerDuo" width={34} height={34} />
          <span className="font-bold text-lg tracking-tight">finTrackerDuo</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 mt-auto mb-2">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Controle suas<br />finanças juntos.
          </h1>
          <p className="text-white/55 text-base leading-relaxed max-w-xs">
            Gerencie receitas, despesas e cartões em um painel moderno — individualmente ou em casal.
          </p>
        </div>

        {/* Copyright */}
        <p className="relative z-10 mt-10 text-xs text-white/25">
          © {new Date().getFullYear()} finTrackerDuo. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">

          {/* Logo mobile (visível apenas quando painel esquerdo está oculto) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <Image src="/finTrackerDuo_logo.svg" alt="finTrackerDuo" width={28} height={28} />
              <span className="font-bold text-lg tracking-tight">finTrackerDuo</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
