"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  valueColor?: string;
  loading?: boolean;
  index?: number;
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  valueColor,
  loading,
  index = 0,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = change !== undefined ? change >= 0 : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
              iconBg
            )}>
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
          </div>

          <p className={cn("text-2xl font-bold tracking-tight", valueColor)}>
            {formatCurrency(value)}
          </p>

          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-1.5 text-xs font-medium",
              isPositive ? "text-success" : "text-expense"
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{formatPercent(change)} em relação ao mês anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
