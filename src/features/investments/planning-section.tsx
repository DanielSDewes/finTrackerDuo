"use client";

import { Target, Calculator, UserCog, Bell, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentGoals } from "./investment-goals";
import { Simulators } from "./simulators";
import { InvestorProfileCard } from "./investor-profile";
import { InvestmentAlerts } from "./investment-alerts";
import { InvestmentAudit } from "./investment-audit";

const TABS = [
  { value: "goals", label: "Metas", icon: Target },
  { value: "simulators", label: "Simuladores", icon: Calculator },
  { value: "profile", label: "Perfil", icon: UserCog },
  { value: "alerts", label: "Alertas", icon: Bell },
  { value: "audit", label: "Auditoria", icon: History },
];

export function PlanningSection() {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Planejamento &amp; Análise</h2>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue="goals">
            <TabsList className="flex flex-wrap h-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="goals" className="mt-4"><InvestmentGoals /></TabsContent>
            <TabsContent value="simulators" className="mt-4"><Simulators /></TabsContent>
            <TabsContent value="profile" className="mt-4"><InvestorProfileCard /></TabsContent>
            <TabsContent value="alerts" className="mt-4"><InvestmentAlerts /></TabsContent>
            <TabsContent value="audit" className="mt-4"><InvestmentAudit /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
