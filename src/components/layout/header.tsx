"use client";

import { Menu, Sun, Moon, Users, User, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useUIStore, type ViewMode } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { usePartner } from "@/hooks/use-partner";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarMobileOpen, viewMode, setViewMode } = useUIStore();
  const { couple } = useAuthStore();
  const { partnerFirstName } = usePartner();
  const { theme, setTheme } = useTheme();

  const modes: { mode: ViewMode; label: string; icon: typeof User }[] = [
    { mode: "individual", label: "Individual", icon: User },
    { mode: "couple", label: "Casal", icon: Users },
    { mode: "partner", label: partnerFirstName, icon: Eye },
  ];

  return (
    <>
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

        {/* View mode toggle (only when couple exists): Individual / Casal / Parceiro */}
        {couple && (
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50">
            {modes.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors max-w-[8rem]",
                  viewMode === mode
                    ? mode === "couple"
                      ? "bg-background shadow-sm text-pink-500"
                      : mode === "partner"
                        ? "bg-background shadow-sm text-sky-500"
                        : "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={mode === "partner" ? `Ver como ${label} (somente leitura)` : label}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
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

      {/* Faixa de aviso do modo "Ver como Parceiro" — lente somente leitura. */}
      {couple && viewMode === "partner" && (
        <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/10 px-4 sm:px-6 py-1.5 text-xs text-sky-600 dark:text-sky-400">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 min-w-0 truncate">
            Vendo as finanças de <span className="font-semibold">{partnerFirstName}</span> — somente leitura.
          </span>
          <button
            type="button"
            onClick={() => setViewMode("individual")}
            className="font-medium hover:underline shrink-0"
          >
            Sair
          </button>
        </div>
      )}
    </>
  );
}
