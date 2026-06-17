"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/features/auth/error-messages";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Troca de senha para o usuário JÁ autenticado (aba Segurança das
 * configurações). Como há sessão ativa, chama updateUser({ password })
 * direto — sem o ida-e-volta de email do fluxo de "esqueci a senha".
 */
export function ChangePasswordForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(updatePasswordSchema);

  const onSubmit = async (data: UpdatePasswordInput) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      const friendly = translateAuthError(error, "Erro ao alterar senha");
      toast.error(friendly.title, { description: friendly.description });
      return;
    }

    toast.success("Senha alterada!", {
      description: "Sua nova senha já está valendo.",
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          leftIcon={<Lock />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
        <Input
          id="confirm-new-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repita a senha"
          leftIcon={<Lock />}
          error={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="animate-spin" /> Salvando...</> : "Alterar senha"}
      </Button>
    </form>
  );
}
