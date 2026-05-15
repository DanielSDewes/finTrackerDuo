"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart, UserPlus, Copy, Mail, Users, CheckCircle, AlertCircle,
  Loader2, Link as LinkIcon, Shield, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { coupleService } from "@/services/couple.service";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";

export function CoupleView() {
  const { user, couple, setCouple } = useAuthStore();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  const { data: coupleData, isLoading } = useQuery({
    queryKey: ["couple", user?.id],
    queryFn: () => coupleService.getCouple(user!.id),
    enabled: !!user,
    initialData: couple,
  });

  const createMutation = useMutation({
    mutationFn: () => coupleService.createCouple(user!.id, inviteEmail),
    onSuccess: (data) => {
      setCouple(data);
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      toast.success("Convite criado!", {
        description: "Compartilhe o link com seu parceiro(a).",
      });
    },
    onError: () => toast.error("Erro ao criar convite"),
  });

  const acceptMutation = useMutation({
    mutationFn: () => coupleService.acceptInvite(inviteToken, user!.id),
    onSuccess: (data) => {
      setCouple(data);
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      toast.success("Convite aceito! Vocês agora estão conectados.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dissolveMutation = useMutation({
    mutationFn: () => coupleService.dissolveCouple(coupleData!.id),
    onSuccess: () => {
      setCouple(null);
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      toast.success("Vínculo encerrado");
    },
    onError: () => toast.error("Erro ao encerrar vínculo"),
  });

  const inviteLink = coupleData?.invite_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${coupleData.invite_token}`
    : "";

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado!");
  };

  const partner = coupleData?.owner_id === user?.id
    ? coupleData?.partner
    : coupleData?.owner;
  const isOwner = coupleData?.owner_id === user?.id;

  return (
    <div>
      <Header title="Área do Casal" subtitle="Gerencie seu vínculo financeiro compartilhado" />

      <div className="p-4 sm:p-6 max-w-2xl space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : coupleData?.status === "active" ? (
          /* Active couple view */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Couple connection card */}
            <Card className="border-pink-500/20 bg-pink-500/5">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <Avatar className="w-16 h-16 mx-auto mb-2">
                        <AvatarImage src={user?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-lg">
                          {user?.name ? getInitials(user.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">Você</p>
                    </div>

                    <Heart className="w-8 h-8 text-pink-500 shrink-0" fill="currentColor" />

                    <div className="text-center">
                      <Avatar className="w-16 h-16 mx-auto mb-2">
                        <AvatarImage src={(partner as any)?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-lg">
                          {(partner as any)?.name ? getInitials((partner as any).name) : "P"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{(partner as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">Parceiro(a)</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Conectados
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vinculados desde {formatDate(coupleData.created_at)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vocês têm acesso às finanças compartilhadas um do outro.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Users,
                  title: "Visão Consolidada",
                  desc: "Veja as finanças do casal no dashboard com o toggle Individual/Casal.",
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  icon: Shield,
                  title: "Transações Compartilhadas",
                  desc: "Ao criar transações, marque como 'Compartilhar com casal'.",
                  color: "text-pink-500",
                  bg: "bg-pink-500/10",
                },
                {
                  icon: TrendingUp,
                  title: "Metas do Casal",
                  desc: "Crie metas financeiras compartilhadas e acompanhem juntos.",
                  color: "text-success",
                  bg: "bg-success/10",
                },
              ].map((f) => (
                <Card key={f.title}>
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <p className="font-medium text-sm mb-1">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Danger zone */}
            <div>
              <h3 className="font-medium text-sm text-destructive mb-2">Zona de Risco</h3>
              <Card className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Encerrar vínculo do casal</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        As finanças compartilhadas continuarão visíveis individualmente.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => dissolveMutation.mutate()}
                      disabled={dissolveMutation.isPending}
                    >
                      {dissolveMutation.isPending ? <Loader2 className="animate-spin" /> : "Encerrar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

        ) : coupleData?.status === "pending" && isOwner ? (
          /* Pending invite - owner view */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">Aguardando aceitação</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Convite enviado para <strong>{coupleData.invite_email}</strong>.
                      Aguardando seu parceiro(a) aceitar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon-sm" onClick={copyInviteLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este link com seu parceiro(a) para ele(a) aceitar o convite.
              </p>
            </div>
          </motion.div>

        ) : (
          /* No couple - create or accept */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-pink-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Conecte-se com seu parceiro(a)</h2>
              <p className="text-muted-foreground text-sm">
                Compartilhe finanças, metas e investimentos com quem você ama.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create invite */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Convidar parceiro(a)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Crie um convite e envie para seu parceiro(a)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Email do parceiro(a)</Label>
                    <Input
                      type="email"
                      placeholder="parceiro@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      leftIcon={<Mail />}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate()}
                    disabled={!inviteEmail || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <><Loader2 className="animate-spin" /> Criando...</>
                    ) : (
                      <><LinkIcon className="w-4 h-4" /> Criar convite</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Accept invite */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Aceitar convite
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Insira o token ou abra o link que recebeu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Token do convite</Label>
                    <Input
                      placeholder="Cole o token aqui..."
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => acceptMutation.mutate()}
                    disabled={!inviteToken || acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <><Loader2 className="animate-spin" /> Aceitando...</>
                    ) : (
                      "Aceitar convite"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
