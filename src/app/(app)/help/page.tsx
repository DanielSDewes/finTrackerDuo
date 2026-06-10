import { Suspense } from "react";
import { HelpView } from "@/features/help/help-view";

// useSearchParams (usado pelo HelpView pra ler ?section=... do deep link)
// exige um boundary de Suspense pra que a página seja prerenderizada sem
// quebrar — o Next.js renderiza no cliente assim que o tree hidrata.
export default function HelpPage() {
  return (
    <Suspense fallback={null}>
      <HelpView />
    </Suspense>
  );
}
