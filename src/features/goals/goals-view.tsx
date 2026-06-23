"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { SplitPaneView } from "@/components/shared/split-pane-view";
import { PartnerScopeNotice } from "@/components/shared/partner-scope-notice";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { GoalList } from "./components/goal-list";
import { SubgoalDetail } from "./components/subgoal-detail";
import { useGoalsStore } from "./stores/goals.store";

export function GoalsView() {
  const { reset } = useGoalsStore();
  const { isPartnerView } = useScopeFilter();

  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Metas Financeiras"
        subtitle="Crie metas e quebre cada uma em sub-metas com link, valor e progresso"
      />
      {isPartnerView ? (
        <PartnerScopeNotice noun="As metas" />
      ) : (
        <SplitPaneView
          panes={[
            { id: "goals", label: "Metas", width: "340px", content: <GoalList /> },
            { id: "detail", label: "Sub-metas", width: "1fr", content: <SubgoalDetail /> },
          ]}
        />
      )}
    </div>
  );
}
