import type { Metadata } from "next";
import { ReacceptView } from "@/features/legal/reaccept-view";

export const metadata: Metadata = {
  title: "Aceite dos Termos",
  description: "Aceite a versão vigente dos Termos de Uso e Política de Privacidade.",
};

export default function ReacceptTermosPage() {
  return <ReacceptView />;
}
