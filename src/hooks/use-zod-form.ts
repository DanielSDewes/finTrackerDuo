"use client";

import {
  useForm,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

type ZodSchemaInput<S> = S extends z.ZodTypeAny
  ? z.input<S> extends FieldValues
    ? z.input<S>
    : FieldValues
  : FieldValues;

/**
 * Wrapper around react-hook-form + zodResolver that hides the `as any` cast
 * needed because zod's resolver typing is too loose for our generic schemas.
 *
 * Usage:
 *   const { register, handleSubmit, formState } = useZodForm(mySchema, {
 *     defaultValues: { ... },
 *   });
 *
 * Para tipar manualmente o shape:
 *   useZodForm<typeof mySchema, MyExplicitInput>(mySchema, { ... });
 */
export function useZodForm<
  S extends z.ZodTypeAny,
  V extends FieldValues = ZodSchemaInput<S>,
>(schema: S, options?: Omit<UseFormProps<V>, "resolver">): UseFormReturn<V> {
  return useForm<V>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    ...options,
  });
}
