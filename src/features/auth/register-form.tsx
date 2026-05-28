"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TermsContent, TERMS_VERSION } from "@/features/legal/terms-content";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(registerSchema);

  const onSubmit = async (data: RegisterInput) => {
    if (!acceptedTerms) {
      toast.error("É necessário aceitar os Termos de Uso para criar a conta.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          terms_accepted: true,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }

    toast.success("Conta criada!", {
      description: "Verifique seu email para confirmar o cadastro.",
    });
    setConfirmationEmail(data.email);
  };

  if (confirmationEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--success)/0.12)] flex items-center justify-center mx-auto">
          <MailCheck className="w-8 h-8 text-[hsl(var(--success))]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Confirme seu e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para
          </p>
          <p className="text-sm font-medium break-all">{confirmationEmail}</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] p-4 text-left space-y-1.5">
          <p className="text-xs font-medium text-[hsl(var(--success))]">
            Verifique sua caixa de mensagens
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Clique no link recebido para ativar sua conta. Se não encontrar, confira a
            pasta de spam ou lixo eletrônico.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/login">Ir para o login</Link>
          </Button>
          <button
            type="button"
            onClick={() => setConfirmationEmail(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Usar outro e-mail
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Heading */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Crie sua conta</h2>
        <p className="text-sm text-muted-foreground">
          Comece a controlar suas finanças hoje mesmo
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Seu nome"
            leftIcon={<User />}
            error={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            leftIcon={<Mail />}
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
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

        {/* Aceite dos Termos — obrigatório */}
        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(v) => setAcceptedTerms(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="accept-terms" className="text-xs text-muted-foreground font-normal leading-relaxed cursor-pointer">
            Li e concordo com os{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="text-primary hover:underline font-medium"
            >
              Termos de Uso e Política de Privacidade
            </button>
            .
          </Label>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !acceptedTerms}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      {/* Diálogo com os Termos de Uso completos */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Termos de Uso e Política de Privacidade</DialogTitle>
          </DialogHeader>
          <TermsContent />
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setAcceptedTerms(true);
                setTermsOpen(false);
              }}
            >
              Li e aceito os Termos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </motion.div>
  );
}
