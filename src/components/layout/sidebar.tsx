"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Target, BarChart3,
  Settings, Heart, ChevronLeft, ChevronRight, LogOut,
  X, CreditCard, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transações" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/calendar", icon: CalendarDays, label: "Calendário" },
  { href: "/investments", icon: TrendingUp, label: "Investimentos" },
  { href: "/goals", icon: Target, label: "Metas" },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
  { href: "/couple", icon: Heart, label: "Casal" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 h-full z-50 border-r border-border/50 bg-card flex flex-col",
          "lg:relative lg:translate-x-0",
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-border/50 shrink-0",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 shrink-0">
              <Image src="/finTrackerDuo_logo.svg" alt="FinTrackerDuo" width={28} height={28} priority />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-base tracking-tight overflow-hidden whitespace-nowrap"
                >
                  FinTrackerDuo
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              className="hidden lg:flex text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto no-scrollbar">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                const linkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarMobileOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                      "hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-foreground",
                      !sidebarCollapsed && "hover:translate-x-0.5",
                      isActive
                        ? "bg-primary/12 border-primary/30 text-primary shadow-sm hover:border-primary hover:bg-primary/15 hover:text-primary hover:translate-x-0"
                        : "border-transparent text-muted-foreground",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeBar"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "group-hover:text-emerald-500"
                      )}
                    />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && !sidebarCollapsed && (
                      <motion.div
                        layoutId="activeDot"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </TooltipProvider>
        </nav>

        <Separator />

        {/* Bottom - User + Settings */}
        <div className="p-2 space-y-1">
          <TooltipProvider delayDuration={0}>
            {[{ href: "/settings", icon: Settings, label: "Configurações" }].map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const content = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                    "hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-foreground",
                    !sidebarCollapsed && "hover:translate-x-0.5",
                    isActive
                      ? "bg-primary/12 border-primary/30 text-primary shadow-sm hover:border-primary hover:bg-primary/15 hover:text-primary hover:translate-x-0"
                      : "border-transparent text-muted-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "group-hover:text-emerald-500"
                    )}
                  />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </TooltipProvider>

          <Separator className="my-2" />

          {/* User profile */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg",
            sidebarCollapsed && "justify-center px-2"
          )}>
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={user?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="text-xs font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Collapse toggle for collapsed state */}
        {sidebarCollapsed && (
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              className="w-full text-muted-foreground hidden lg:flex"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.aside>
    </>
  );
}
