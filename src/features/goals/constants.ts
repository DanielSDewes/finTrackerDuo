import {
  Plane,
  Car,
  House,
  Shield,
  Sunset,
  GraduationCap,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { GoalCategory } from "@/types";

type GoalCategoryMeta = {
  value: GoalCategory;
  label: string;
  icon: LucideIcon;
};

export const GOAL_CATEGORIES: readonly GoalCategoryMeta[] = [
  { value: "travel",     label: "Viagem",       icon: Plane },
  { value: "car",        label: "Carro",        icon: Car },
  { value: "house",      label: "Casa/Imóvel",  icon: House },
  { value: "emergency",  label: "Emergência",   icon: Shield },
  { value: "retirement", label: "Aposentadoria", icon: Sunset },
  { value: "education",  label: "Educação",     icon: GraduationCap },
  { value: "other",      label: "Outro",        icon: Target },
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
