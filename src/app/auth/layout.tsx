import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autenticação | FinTracker",
  description: "Acesse sua conta ou crie uma nova",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
