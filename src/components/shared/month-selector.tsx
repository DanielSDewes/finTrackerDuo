"use client";

import { useRef, useEffect } from "react";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

export function getMonthWindow(selectedMonth: string, before = 5, after = 6): string[] {
  const [year, month] = selectedMonth.split("-").map(Number);
  const months: string[] = [];
  for (let offset = -before; offset <= after; offset++) {
    const d = new Date(Date.UTC(year, month - 1 + offset, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function formatMonthChip(month: string): { short: string; year: string } {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  const short = date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
  return { short, year: String(y) };
}

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const months = getMonthWindow(selectedMonth);

  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = selectedRef.current;
      const scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [selectedMonth]);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none" }}
    >
      {months.map((month) => {
        const isSelected = month === selectedMonth;
        const isCurrent = month === currentMonth;
        const { short, year } = formatMonthChip(month);

        return (
          <button
            key={month}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => setSelectedMonth(month)}
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-all min-w-[56px] cursor-pointer",
              isSelected
                ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))] shadow-sm"
                : isCurrent
                  ? "border-[hsl(var(--primary)/0.4)] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.6)] hover:bg-[hsl(var(--muted)/0.3)]"
                  : "border-border/50 text-[hsl(var(--muted-foreground))] hover:border-border hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]"
            )}
          >
            <span className="font-semibold capitalize">{short}</span>
            <span className="text-[10px] opacity-60">{year}</span>
          </button>
        );
      })}
    </div>
  );
}
