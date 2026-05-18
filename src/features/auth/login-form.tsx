"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(loginSchema);

  const onSubmit = async (data: LoginInput) => {
    setPendingEmail(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      const code = (error as { code?: string }).code ?? "";
      const isUnconfirmed =
        code === "email_not_confirmed" ||
        msg.includes("email not confirmed") ||
        msg.includes("not confirmed") ||
        msg.includes("confirm");

      if (isUnconfirmed) {
        setPendingEmail(data.email);
        toast.warning("E-mail pendente de confirmação", {
          description: "Verifique sua caixa de mensagens para ativar a conta.",
        });
        return;
      }

      toast.error("Credenciais inválidas", { description: "Verifique seu email e senha." });
      return;
    }

    toast.success("Bem-vindo de volta!");
    router.push("/dashboard");
    router.refresh();
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error("Não foi possível reenviar o e-mail", { description: error.message });
      return;
    }
    toast.success("E-mail de confirmação reenviado!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Heading */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
        <p className="text-sm text-muted-foreground">
          Insira seu email e senha para acessar sua conta
        </p>
      </div>

      {pendingEmail && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-start gap-3"
        >
          <MailWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-left">
            <p className="text-xs font-medium text-foreground">
              E-mail ainda não confirmado
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifique sua caixa de mensagens (incluindo spam) e clique no link enviado
              para {pendingEmail}.
            </p>
            <button
              type="button"
              onClick={handleResend}
              className="text-xs font-medium text-warning hover:underline"
            >
              Reenviar e-mail de confirmação
            </button>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            leftIcon={<Mail />}
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/auth/reset-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
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
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/auth/register" className="text-primary hover:underline font-medium">
          Criar conta
        </Link>
      </p>
    </motion.div>
  );
}
