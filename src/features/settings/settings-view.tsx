"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User, Palette, Shield, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types";
import { getInitials } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const profileSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100),
  phone: z.string().optional(),
  currency: z.string(),
});

type ProfileInput = z.infer<typeof profileSchema>;

export function SettingsView() {
  const { user, setUser, reset } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      currency: user?.currency ?? "BRL",
    },
  });

  const updateProfile = async (data: ProfileInput) => {
    const supabase = createClient();
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user!.id)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao atualizar perfil");
      return;
    }

    setUser(updated as UserProfile);
    toast.success("Perfil atualizado!");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/");
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="p-4 sm:p-6 max-w-2xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-1.5" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-1.5" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-1.5" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize suas informações de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-lg">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleSubmit(updateProfile)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input placeholder="Seu nome" error={!!errors.name} {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">Email não pode ser alterado aqui</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input placeholder="+55 (11) 99999-9999" {...register("phone")} />
                  </div>

                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select defaultValue={user?.currency ?? "BRL"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                        <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="animate-spin" /> Salvando...</> : "Salvar alterações"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>Escolha entre modo claro, escuro ou automático</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Claro" },
                    { value: "dark", label: "Escuro" },
                    { value: "system", label: "Sistema" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        theme === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Senha</CardTitle>
                <CardDescription>Altere sua senha de acesso</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="/auth/reset-password">Redefinir senha por email</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Risco</CardTitle>
                <CardDescription>Ações irreversíveis na sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
