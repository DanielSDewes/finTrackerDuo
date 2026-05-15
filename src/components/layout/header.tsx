"use client";

import { Menu, Sun, Moon, Users, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarMobileOpen, viewMode, setViewMode } = useUIStore();
  const { couple } = useAuthStore();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {title && (
          <div>
            <h1 className="text-sm font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* View mode toggle (only when couple exists) */}
      {couple && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
          <User className={cn("w-3.5 h-3.5", viewMode === "individual" ? "text-primary" : "text-muted-foreground")} />
          <Switch
            id="view-mode"
            checked={viewMode === "couple"}
            onCheckedChange={(checked) => setViewMode(checked ? "couple" : "individual")}
            className="data-[state=checked]:bg-pink-500"
          />
          <Users className={cn("w-3.5 h-3.5", viewMode === "couple" ? "text-pink-500" : "text-muted-foreground")} />
          <Label htmlFor="view-mode" className="text-xs font-medium cursor-pointer">
            {viewMode === "couple" ? "Casal" : "Individual"}
          </Label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
