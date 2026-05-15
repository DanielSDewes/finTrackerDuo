"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";
import { formatDate } from "@/lib/utils";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useUIStore();

  const navigate = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, direction === "prev" ? month - 2 : month);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  const displayDate = formatDate(`${selectedMonth}-01`, "MMMM 'de' yyyy");

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => navigate("prev")}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="min-w-[140px] text-center">
        <span className="text-sm font-medium capitalize">{displayDate}</span>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => navigate("next")}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
