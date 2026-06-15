"use client";

import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { investmentSchema, type InvestmentInput } from "@/schemas/investment";
import { investmentsService } from "@/services/investments.service";
import { useAuthStore } from "@/stores/auth.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
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
  const { isShared: scopeShared } = useScopeFilter();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
    useZodForm(investmentSchema, {
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
        // yield_rate é fração no banco; exibimos em % para o usuário.
        yield_rate: investment?.yield_rate != null ? investment.yield_rate * 100 : null,
        yield_period: investment?.yield_period ?? null,
        is_shared: investment?.is_shared ?? scopeShared,
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

  const mutation = useToastMutation({
    mutationFn: async (data: InvestmentInput) => {
      const yieldRateFraction =
        data.yield_rate != null && data.yield_period ? data.yield_rate / 100 : null;
      const yieldPeriod = yieldRateFraction != null ? data.yield_period ?? null : null;

      const payload = {
        ...data,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        is_active: true,
        yield_rate: yieldRateFraction,
        yield_period: yieldPeriod,
        profitability: data.invested_amount > 0
          ? ((data.current_value - data.invested_amount) / data.invested_amount) * 100
          : 0,
      };

      const saved = investment?.id
        ? await investmentsService.updateInvestment(investment.id, payload)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : await investmentsService.createInvestment(payload as any);

      await investmentsService.logAudit({
        user_id: user!.id,
        action: investment?.id ? "update" : "create",
        entity: "investment",
        label: data.asset_name,
      });

      return saved;
    },
    invalidateKeys: [["investment-summary"], ["investment-audit"]],
    successMessage: investment ? "Investimento atualizado!" : "Investimento adicionado!",
    errorMessage: "Erro ao salvar investimento",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as InvestmentInput))} className="space-y-4">
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
          <Input
            type="number"
            step="0.01"
            readOnly
            className="bg-muted/50"
            {...register("dividends_received")}
          />
          <p className="text-[10px] text-muted-foreground">
            Soma do histórico — lance novos dividendos na tela de detalhes.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Data de Compra</Label>
          <Input type="date" {...register("purchase_date")} />
        </div>
      </div>

      <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
        <div>
          <Label className="text-sm">Rendimento automático</Label>
          <p className="text-[11px] text-muted-foreground">
            Se informado, o sistema aplica juros compostos diariamente no valor atual.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="yield_rate" className="text-xs">Taxa (%)</Label>
            <Input
              id="yield_rate"
              type="number"
              step="0.0001"
              placeholder="Ex: 1.2"
              {...register("yield_rate")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Controller
              name="yield_period"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem rendimento</SelectItem>
                    <SelectItem value="daily">Ao dia</SelectItem>
                    <SelectItem value="monthly">Ao mês</SelectItem>
                    <SelectItem value="annual">Ao ano</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
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
