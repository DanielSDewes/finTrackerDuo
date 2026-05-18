"use client";

import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Insere um separator imediatamente *antes* deste item. */
  separator?: boolean;
};

type RowActionsMenuProps = {
  actions: RowAction[];
  align?: "start" | "end" | "center";
  /** Use uma `Button` custom como trigger (ex.: tema escuro sobre card). */
  triggerClassName?: string;
  triggerIconClassName?: string;
  /** Por padrão clicar no menu não dispara o onClick do pai. */
  stopPropagation?: boolean;
};

export function RowActionsMenu({
  actions,
  align = "end",
  triggerClassName,
  triggerIconClassName,
  stopPropagation = true,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("h-7 w-7 shrink-0", triggerClassName)}
          onClick={(e) => stopPropagation && e.stopPropagation()}
        >
          <MoreVertical className={cn("w-3.5 h-3.5", triggerIconClassName)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        onClick={(e) => stopPropagation && e.stopPropagation()}
      >
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <div key={i}>
              {action.separator && i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={action.disabled}
                className={
                  action.destructive
                    ? "text-destructive focus:text-destructive"
                    : undefined
                }
                onClick={(e) => {
                  if (stopPropagation) e.stopPropagation();
                  action.onClick();
                }}
              >
                <Icon className="w-4 h-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
