"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { investmentSchema, type InvestmentInput } from "@/schemas/investment";
import { investmentsService } from "@/services/investments.service";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Investment } from "@/types";

const assetClasses = [
  { value: "fixed_income", label: "Renda Fixa" },
  { value: "variable_income", label: "Renda Variável" },
  { value: "crypto", label: "Criptomoedas" },
  { value: "real_estate", label: "Fundos Imobiliários" },
  { value: "other", label: "Outros" },
];

const subcategories: Record<string, string[]> = {
  fixed_income: ["CDB", "Tesouro Direto", "LCI", "LCA", "Debêntures", "CRI", "CRA", "Poupança"],
  variable_income: ["Ações", "ETF", "BDR", "Opções"],
  crypto: ["Bitcoin", "Ethereum", "Altcoins", "Stablecoins"],
  real_estate: ["FII", "FIAGRO", "CRI Imobiliário"],
  other: ["Fundos Multimercado", "Previdência Privada", "COE", "Outros"],
};

type InvestmentFormProps = {
  investment?: Investment | null;
  onSuccess?: () => void;
};

export function InvestmentForm({ investment, onSuccess }: InvestmentFormProps) {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
    useForm<InvestmentInput>({
      resolver: zodResolver(investmentSchema) as any,
      defaultValues: {
        asset_class: investment?.asset_class ?? "fixed_income",
        subcategory: investment?.subcategory ?? "",
        broker: investment?.broker ?? "",
        asset_name: investment?.asset_name ?? "",
        ticker: investment?.ticker ?? "",
        quantity: investment?.quantity ?? 1,
        average_price: investment?.average_price ?? 0,
        current_price: investment?.current_price ?? 0,
        invested_amount: investment?.invested_amount ?? 0,
        current_value: investment?.current_value ?? 0,
        dividends_received: investment?.dividends_received ?? 0,
        is_shared: investment?.is_shared ?? (viewMode === "couple"),
        purchase_date: investment?.purchase_date ?? "",
        notes: investment?.notes ?? "",
      },
    });

  const assetClass = watch("asset_class");
  const quantity = watch("quantity");
  const averagePrice = watch("average_price");
  const currentPrice = watch("current_price");

  useEffect(() => {
    const qty = Number(quantity) || 0;
    const avg = Number(averagePrice) || 0;
    const cur = Number(currentPrice) || 0;
    setValue("invested_amount", qty * avg);
    setValue("current_value", qty * cur);
  }, [quantity, averagePrice, currentPrice, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: InvestmentInput) => {
      const payload = {
        ...data,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        is_active: true,
        profitability: data.invested_amount > 0
          ? ((data.current_value - data.invested_amount) / data.invested_amount) * 100
          : 0,
      };

      if (investment?.id) {
        return investmentsService.updateInvestment(investment.id, payload);
      }
      return investmentsService.createInvestment(payload as any);
    },
    onSuccess: () => {
      toast.success(investment ? "Investimento atualizado!" : "Investimento adicionado!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao salvar investimento"),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Classe do Ativo</Label>
          <Controller
            name="asset_class"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetClasses.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Subcategoria</Label>
          <Controller
            name="subcategory"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(subcategories[assetClass] ?? []).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nome do Ativo</Label>
        <Input placeholder="Ex: Tesouro Selic 2027, PETR4" {...register("asset_name")} />
        {errors.asset_name && <p className="text-xs text-destructive">{errors.asset_name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Ticker (opcional)</Label>
          <Input placeholder="PETR4" {...register("ticker")} />
        </div>
        <div className="space-y-2">
          <Label>Corretora</Label>
          <Input placeholder="XP, Rico, Nu..." {...register("broker")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input type="number" step="0.00000001" {...register("quantity")} />
        </div>
        <div className="space-y-2">
          <Label>Preço Médio (R$)</Label>
          <Input type="number" step="0.000001" {...register("average_price")} />
        </div>
        <div className="space-y-2">
          <Label>Preço Atual (R$)</Label>
          <Input type="number" step="0.000001" {...register("current_price")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Valor Investido (R$)</Label>
          <Input type="number" step="0.01" readOnly {...register("invested_amount")} className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label>Valor Atual (R$)</Label>
          <Input type="number" step="0.01" readOnly {...register("current_value")} className="bg-muted/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Dividendos Recebidos (R$)</Label>
          <Input type="number" step="0.01" defaultValue={0} {...register("dividends_received")} />
        </div>
        <div className="space-y-2">
          <Label>Data de Compra</Label>
          <Input type="date" {...register("purchase_date")} />
        </div>
      </div>

      {couple && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <Label htmlFor="is_shared">Compartilhar com casal</Label>
          <Controller
            name="is_shared"
            control={control}
            render={({ field }) => (
              <Switch id="is_shared" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea placeholder="Notas sobre este investimento..." rows={2} {...register("notes")} />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <><Loader2 className="animate-spin" /> Salvando...</> : (investment ? "Atualizar" : "Adicionar investimento")}
      </Button>
    </form>
  );
}
