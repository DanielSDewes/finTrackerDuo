"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Compact = used inside small panels (sidebar lists). Full = full-page emptiness. */
  variant?: "compact" | "full";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "compact",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3",
        variant === "compact" ? "h-48 p-6" : "py-20 px-8",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center",
          variant === "compact" ? "w-12 h-12" : "w-16 h-16",
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            variant === "compact" ? "w-6 h-6" : "w-8 h-8",
          )}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
