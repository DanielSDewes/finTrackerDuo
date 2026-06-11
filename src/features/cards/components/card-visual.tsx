"use client";

import { cn, formatCurrency } from "@/lib/utils";
import type { CreditCard, CardBrand } from "../types";

type CardVisualProps = {
  card: CreditCard;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
};

const BRAND_ICON: Record<CardBrand, React.ReactNode> = {
  visa: (
    <span className="font-black italic tracking-tighter text-[#ffffff] text-lg leading-none">VISA</span>
  ),
  mastercard: (
    <span className="flex items-center gap-0.5">
      <span className="w-4 h-4 rounded-full bg-[#eb001b] opacity-90 inline-block" />
      <span className="w-4 h-4 rounded-full bg-[#f79e1b] opacity-90 inline-block -ml-2" />
    </span>
  ),
  elo: (
    <span className="font-black tracking-widest text-[#FFCB00] text-sm leading-none">ELO</span>
  ),
  amex: (
    <span className="font-bold tracking-widest text-[#ffffff] text-xs leading-none">AMEX</span>
  ),
  hipercard: (
    <span className="font-bold tracking-tight text-[#ffffff] text-xs leading-none">HIPER</span>
  ),
  other: (
    <span className="font-bold text-[#ffffff] text-xs leading-none">CARD</span>
  ),
};

const CHIP_SVG = (
  <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
    <rect x="1" y="1" width="30" height="22" rx="3" fill="#d4af37" stroke="#b8962e" strokeWidth="0.5" />
    <rect x="10" y="1" width="12" height="22" fill="#c9a227" />
    <rect x="1" y="8" width="30" height="8" fill="#c9a227" />
    <rect x="10" y="8" width="12" height="8" fill="#b8962e" />
  </svg>
);

const SIZES = {
  sm: { card: "w-48 h-28 rounded-xl", font: "text-xs", name: "text-sm" },
  md: { card: "w-64 h-40 rounded-2xl", font: "text-sm", name: "text-base" },
  lg: { card: "w-80 h-48 rounded-2xl", font: "text-sm", name: "text-lg" },
};

export function CardVisual({ card, size = "md", selected, onClick }: CardVisualProps) {
  const sz = SIZES[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        sz.card,
        "relative overflow-hidden flex flex-col justify-between p-4 shadow-lg select-none transition-all duration-200",
        onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.99]",
        selected && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-[1.02]"
      )}
      style={{ background: card.color }}
    >
      {/* Glossy overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* Top row: chip + brand */}
      <div className="flex items-start justify-between relative z-10">
        <div className={size === "sm" ? "scale-75 origin-top-left" : ""}>
          {CHIP_SVG}
        </div>
        <div className="flex items-center">
          {BRAND_ICON[card.brand]}
        </div>
      </div>

      {/* Bottom row: name + limit info */}
      <div className="relative z-10 space-y-1">
        <p className={cn(sz.name, "font-bold text-white drop-shadow-sm truncate leading-tight")}>{card.name}</p>
        {size !== "sm" && (
          <div className="flex items-center justify-between">
            <p className={cn(sz.font, "text-white/70 font-mono tracking-widest")}>**** **** ****</p>
            <p className={cn(sz.font, "text-white/80 font-medium")}>
              {formatCurrency(card.limit_amount, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>

      {/* Decorative circles */}
      <div
        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: "rgba(255,255,255,0.5)" }}
      />
      <div
        className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full opacity-10 pointer-events-none"
        style={{ background: "rgba(255,255,255,0.5)" }}
      />
    </div>
  );
}
