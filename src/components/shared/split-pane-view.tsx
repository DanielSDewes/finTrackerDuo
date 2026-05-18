"use client";

import type { ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type SplitPane = {
  /** ID único do painel — usado como value da tab. */
  id: string;
  /** Label exibida na tab no mobile. */
  label: string;
  /** Largura no grid desktop (ex.: "280px", "1fr"). */
  width: string;
  content: ReactNode;
};

type SplitPaneViewProps = {
  panes: SplitPane[];
  /** Painel ativo por padrão no mobile. Default = primeiro pane. */
  defaultMobilePane?: string;
  className?: string;
};

/**
 * Layout master-detail responsivo:
 *   - Desktop (lg+): grid horizontal com larguras customizáveis por pane.
 *   - Mobile: tabs com TabsList no topo.
 *
 * Substitui o template duplicado em cards-view e goals-view.
 */
export function SplitPaneView({
  panes,
  defaultMobilePane,
  className,
}: SplitPaneViewProps) {
  const gridCols = panes.map((p) => p.width).join("_");
  const defaultValue = defaultMobilePane ?? panes[0]?.id;

  return (
    <>
      {/* Desktop: panes lado a lado */}
      <div
        className={`hidden lg:grid flex-1 min-h-0 divide-x divide-border/50 ${className ?? ""}`}
        style={{ gridTemplateColumns: panes.map((p) => p.width).join(" ") }}
        // gridCols intentionally also passed inline since Tailwind cannot read dynamic class names
        data-cols={gridCols}
      >
        {panes.map((p) => (
          <div key={p.id} className="overflow-hidden">
            {p.content}
          </div>
        ))}
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <Tabs
          defaultValue={defaultValue}
          className="flex flex-col h-full overflow-hidden"
        >
          <TabsList className="mx-4 mt-4 shrink-0 w-[calc(100%-2rem)]">
            {panes.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="flex-1">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {panes.map((p) => (
            <TabsContent
              key={p.id}
              value={p.id}
              className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden"
            >
              {p.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
