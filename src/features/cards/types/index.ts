export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "other";
export type BillStatus = "open" | "closed" | "paid" | "overdue";

export type CreditCard = {
  id: string;
  user_id: string;
  couple_id: string | null;
  name: string;
  brand: CardBrand;
  color: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // computed
  total_used?: number;
};

export type CreditCardBill = {
  id: string;
  card_id: string;
  month: number;
  year: number;
  status: BillStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type CreditCardTransaction = {
  id: string;
  bill_id: string;
  card_id: string;
  user_id: string;
  couple_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  category_id: string | null;
  date: string;
  is_installment: boolean;
  installment_group_id: string | null;
  installment_number: number;
  installment_total: number;
  is_last_installment: boolean;
  is_shared: boolean;
  shared_group_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category?: { id: string; name: string; color: string; icon: string } | null;
};

export type CardMonth = {
  month: number;
  year: number;
  bill: CreditCardBill | null;
  label: string;
};

export const BRAND_META: Record<CardBrand, { label: string; abbr: string; bg: string; text: string }> = {
  visa: { label: "Visa", abbr: "VISA", bg: "#1a1f71", text: "#ffffff" },
  mastercard: { label: "Mastercard", abbr: "MC", bg: "#252525", text: "#eb001b" },
  elo: { label: "Elo", abbr: "ELO", bg: "#000000", text: "#FFCB00" },
  amex: { label: "American Express", abbr: "AMEX", bg: "#006FCF", text: "#ffffff" },
  hipercard: { label: "Hipercard", abbr: "HIPER", bg: "#CC0000", text: "#ffffff" },
  other: { label: "Outro", abbr: "CARD", bg: "#374151", text: "#ffffff" },
};

export const BILL_STATUS_META: Record<BillStatus, { label: string; color: string }> = {
  open: { label: "Aberta", color: "hsl(var(--primary))" },
  closed: { label: "Fechada", color: "hsl(var(--muted-foreground))" },
  paid: { label: "Paga", color: "hsl(var(--success))" },
  overdue: { label: "Atrasada", color: "hsl(var(--expense))" },
};

export const CARD_PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#1a1f71", "#374151", "#111827",
];
