"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/features/auth/error-messages";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SessionState = "checking" | "ready" | "invalid";

export default function UpdatePasswordPage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(updatePasswordSchema);

  // Esta tela só é válida com a sessão de recuperação criada pela callback
  // (que troca o ?code do link do email). Sem usuário => link inválido/expirado.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setSessionState(data.user ? "ready" : "invalid"))
      .catch(() => setSessionState("invalid"));
  }, []);

  const onSubmit = async (data: UpdatePasswordInput) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      const friendly = translateAuthError(error, "Erro ao redefinir senha");
      toast.error(friendly.title, { description: friendly.description });
      return;
    }

    toast.success("Senha redefinida!", {
      description: "Entre novamente com a sua nova senha.",
    });
    // Encerra a sessão de recuperação e leva para o login com a senha nova.
    // window.location garante que o middleware releia os cookies já limpos.
    await supabase.auth.signOut().catch(() => {});
    window.location.assign("/auth/login");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight">FinTrackerDuo</span>
        </div>
      </div>

      <Card className="border-border/50 shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">Nova senha</CardTitle>
          <CardDescription>Escolha uma senha forte para a sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionState === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Validando o link...</span>
            </div>
          ) : sessionState === "invalid" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div>
                <p className="font-semibold">Link inválido ou expirado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Peça um novo link de redefinição para continuar.
                </p>
              </div>
              <Link href="/auth/reset-password">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                  Pedir novo link
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
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
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
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

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="animate-spin" /> Redefinindo...</> : "Redefinir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
