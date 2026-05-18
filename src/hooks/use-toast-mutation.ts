"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

type ToastMutationOptions<TData, TError, TVars, TContext> = UseMutationOptions<
  TData,
  TError,
  TVars,
  TContext
> & {
  /** Mensagem mostrada no toast.success (omita para silenciar). */
  successMessage?: string;
  /** Mensagem mostrada no toast.error em caso de falha não tratada. */
  errorMessage?: string;
  /** Lista de queryKeys a invalidar no sucesso (ou true para invalidar tudo). */
  invalidateKeys?: QueryKey[];
};

/**
 * useMutation com toast + invalidate padronizados — reduz boilerplate em
 * praticamente todos os forms da aplicação.
 *
 * Se você precisar de comportamento custom em onSuccess/onError, passe-o
 * normalmente; será chamado *depois* do toast/invalidate.
 */
export function useToastMutation<TData = unknown, TError = Error, TVars = void, TContext = unknown>(
  options: ToastMutationOptions<TData, TError, TVars, TContext>,
) {
  const queryClient = useQueryClient();
  const {
    successMessage,
    errorMessage,
    invalidateKeys,
    onSuccess,
    onError,
    ...rest
  } = options;

  return useMutation<TData, TError, TVars, TContext>({
    ...rest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (...args: any[]) => {
      if (invalidateKeys && invalidateKeys.length > 0) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      if (successMessage) toast.success(successMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (onSuccess as any)?.(...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (...args: any[]) => {
      if (errorMessage) toast.error(errorMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (onError as any)?.(...args);
    },
  });
}
