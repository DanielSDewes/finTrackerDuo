"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight, TrendingUp, Shield, Users, BarChart3, Target, Wallet,
  CheckCircle, Star, ChevronRight, Zap, Lock, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.0, 0.0, 0.58, 1.0] },
  }),
};

const features = [
  {
    icon: Wallet,
    title: "Controle Total",
    description: "Gerencie entradas, saídas, contas e cartões em um único lugar com visão completa do seu patrimônio.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Finanças do Casal",
    description: "Compartilhe contas, metas e despesas com seu parceiro. Visão individual e consolidada do casal.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: TrendingUp,
    title: "Investimentos",
    description: "Acompanhe renda fixa, variável, FIIs e criptomoedas. Calcule rentabilidade e dividendos automaticamente.",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: Target,
    title: "Metas Financeiras",
    description: "Defina metas de viagem, carro, emergência e muito mais. Acompanhe o progresso em tempo real.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: BarChart3,
    title: "Dashboards Analíticos",
    description: "Gráficos modernos de fluxo de caixa, evolução patrimonial e gastos por categoria.",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    icon: Shield,
    title: "Segurança Avançada",
    description: "Dados protegidos com Row Level Security, criptografia e autenticação segura via Supabase.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

const plans = [
  {
    name: "Individual",
    price: "Grátis",
    period: "",
    description: "Para quem quer começar a controlar as finanças pessoais",
    features: [
      "Controle de entradas e saídas",
      "Categorias personalizadas",
      "Dashboard básico",
      "Metas financeiras",
      "Lançamentos futuros",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Casal",
    price: "R$ 19",
    period: "/mês",
    description: "Para casais que querem organizar as finanças juntos",
    features: [
      "Tudo do plano Individual",
      "Conta compartilhada do casal",
      "Visão consolidada",
      "Metas do casal",
      "Investimentos compartilhados",
      "Relatórios avançados",
      "Sincronização em tempo real",
    ],
    cta: "Começar 14 dias grátis",
    highlighted: true,
  },
];

const stats = [
  { value: "10k+", label: "Usuários ativos" },
  { value: "R$ 50M+", label: "Gerenciados" },
  { value: "98%", label: "Satisfação" },
  { value: "4.9", label: "Avaliação média" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image src="/finTrackerDuo_logo.svg" alt="FinTrackerDuo" width={32} height={32} />
              <span className="font-bold text-xl tracking-tight">FinTrackerDuo</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  Criar conta
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 text-primary">
              <Zap className="w-3 h-3 mr-1" />
              Plataforma financeira para casais e individuais
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
          >
            Controle financeiro
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              inteligente e compartilhado
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
          >
            Gerencie suas finanças pessoais ou compartilhe com seu parceiro.
            Dashboards analíticos, investimentos, metas e muito mais em uma plataforma moderna.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
          >
            <Link href="/auth/register">
              <Button size="xl" className="w-full sm:w-auto">
                Começar gratuitamente
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                Ver demonstração
              </Button>
            </Link>
          </motion.div>

          <motion.p
            className="text-xs text-muted-foreground mt-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
          >
            Grátis para sempre no plano Individual. Sem cartão de crédito.
          </motion.p>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          className="relative max-w-5xl mx-auto mt-20 px-4"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <div className="relative rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border/50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                  fintrackerduo.app/dashboard
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-background/50">
              {[
                { label: "Saldo Total", value: "R$ 47.850", change: "+12,4%", color: "text-foreground" },
                { label: "Receitas do Mês", value: "R$ 8.500", change: "+5,2%", color: "text-success" },
                { label: "Despesas do Mês", value: "R$ 3.240", change: "-2,1%", color: "text-expense" },
                { label: "Investimentos", value: "R$ 32.000", change: "+18,7%", color: "text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-success mt-0.5">{stat.change}</p>
                </div>
              ))}
            </div>

            <div className="h-40 bg-gradient-to-b from-background/50 to-background flex items-end px-6 pb-6">
              <div className="w-full flex items-end gap-1 h-full">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                    <div
                      className="rounded-t bg-primary/30"
                      style={{ height: `${h * 0.6}%` }}
                    />
                    <div
                      className="rounded-t bg-expense/30"
                      style={{ height: `${h * 0.35}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <p className="text-3xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Funcionalidades
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para
              <br />
              <span className="text-primary">organizar suas finanças</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa com todas as ferramentas para você e seu parceiro
              terem controle total das finanças pessoais e compartilhadas.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card className="h-full hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Couple section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-pink-500/30 text-pink-500">
              Sistema Casal
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Finanças compartilhadas
              <br />
              <span className="text-pink-500">sem complicação</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Crie sua conta",
                description: "Cadastre-se e configure seu perfil financeiro individual em menos de 2 minutos.",
              },
              {
                step: "02",
                title: "Convide seu parceiro",
                description: "Envie um convite por email para conectar as contas e formar a unidade financeira do casal.",
              },
              {
                step: "03",
                title: "Gerencie juntos",
                description: "Visualize finanças individuais e compartilhadas, defina metas e monitorem tudo em tempo real.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold text-lg">{item.step}</span>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute translate-x-32 text-border w-6 h-6" />
                )}
                <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Preços simples
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planos para todas as necessidades</h2>
            <p className="text-muted-foreground text-lg">Comece grátis, evolua quando precisar.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <Card className={`h-full relative ${plan.highlighted ? "border-primary shadow-lg shadow-primary/10" : ""}`}>
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3">
                        <Star className="w-3 h-3 mr-1" />
                        Mais popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground font-medium mb-1">{plan.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link href="/auth/register" className="block">
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        size="lg"
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-16 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            {[
              { icon: Lock, text: "Dados criptografados" },
              { icon: Shield, text: "Row Level Security" },
              { icon: Globe, text: "Hospedado no Brasil" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Pronto para organizar suas finanças?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Junte-se a milhares de pessoas que já controlam melhor seu dinheiro com o FinTrackerDuo.
            </p>
            <Link href="/auth/register">
              <Button size="xl">
                Criar conta grátis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/finTrackerDuo_logo.svg" alt="FinTrackerDuo" width={24} height={24} />
              <span className="font-semibold text-sm">FinTrackerDuo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              2025 FinTrackerDuo. Todos os direitos reservados.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link href="/termos" className="hover:text-foreground transition-colors">Privacidade</Link>
              <Link href="/termos" className="hover:text-foreground transition-colors">Termos</Link>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
