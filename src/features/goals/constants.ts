import type { GoalCategory } from "@/types";

type GoalCategoryMeta = {
  value: GoalCategory;
  label: string;
  icon: string;
};

export const GOAL_CATEGORIES: readonly GoalCategoryMeta[] = [
  { value: "travel", label: "Viagem", icon: "✈" },
  { value: "car", label: "Carro", icon: "🚗" },
  { value: "house", label: "Casa/Imóvel", icon: "🏠" },
  { value: "emergency", label: "Emergência", icon: "🛡" },
  { value: "retirement", label: "Aposentadoria", icon: "🌅" },
  { value: "education", label: "Educação", icon: "📚" },
  { value: "other", label: "Outro", icon: "🎯" },
] as const;

const byValue = new Map(GOAL_CATEGORIES.map((c) => [c.value, c]));

export function getGoalCategory(value: string | null | undefined): GoalCategoryMeta {
  return byValue.get(value as GoalCategory) ?? GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
}

export const GOAL_STATUS_META: Record<
  string,
  { label: string; variant: "success" | "warning" | "outline" }
> = {
  active: { label: "Ativa", variant: "success" },
  completed: { label: "Concluída", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  cancelled: { label: "Cancelada", variant: "outline" },
};
