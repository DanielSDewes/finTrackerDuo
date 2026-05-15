"use client";

import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";

function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

type CategoryIconProps = LucideProps & {
  name: string;
  fallback?: React.ReactNode;
};

export function CategoryIcon({ name, fallback = null, ...props }: CategoryIconProps) {
  const iconName = toPascalCase(name);
  const Icon = (LucideIcons as Record<string, unknown>)[iconName] as
    | React.ComponentType<LucideProps>
    | undefined;

  if (!Icon) return <>{fallback}</>;
  return <Icon {...props} />;
}
