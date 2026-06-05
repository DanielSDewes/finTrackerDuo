import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { CreditCard, CreditCardBill, CreditCardTransaction } from "../types";
import type { CreditCardInput, CardTransactionInput, CardTransactionEditInput } from "../schemas/card.schema";

function endOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
}

// Move a YYYY-MM-DD date string into target (year, month), clamping the day to
// the last valid day of that month (ex: 31/Jan → 28/Fev). Usado quando uma
// recorrência precisa "viajar" para um mês com menos dias.
function shiftDateToMonth(dateStr: string, year: number, month: number): string {
  const [, , dStr] = dateStr.split("-");
  const day = Number.parseInt(dStr, 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

export const cardsService = {
  // ─── Cards ────────────────────────────────────────────────────────────────

  async getCards(userId: string, coupleId: string | null, isShared = false, consolidateCouple = false) {
    const supabase = createClient();
    let query = supabase
      .from("credit_cards")
      .select("*")
      .eq("is_active", true)
      .order("created_at");

    query = applyScopeFilter(query, { userId, coupleId, isShared, consolidateCouple });

    const { data, error } = await query;
    if (error) throw error;

    // Attach total_used (sum of unpaid bills) per card
    const cards = await Promise.all(
      (data as CreditCard[]).map(async (card) => {
        const { data: bills } = await supabase
          .from("credit_card_bills")
          .select("total_amount, status")
          .eq("card_id", card.id)
          .neq("status", "paid");
        const total_used = bills?.reduce((s, b) => s + b.total_amount, 0) ?? 0;
        return { ...card, total_used };
      })
    );

    return cards;
  },

  async createCard(input: CreditCardInput, userId: string, coupleId: string | null) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ ...input, user_id: userId, couple_id: coupleId })
      .select()
      .single();
    if (error) throw error;
    return data as CreditCard;
  },

  async updateCard(id: string, input: Partial<CreditCardInput>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_cards")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CreditCard;
  },

  async deleteCard(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("credit_cards")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  // ─── Bills ────────────────────────────────────────────────────────────────

  async getBills(cardId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_card_bills")
      .select("*")
      .eq("card_id", cardId)
      .order("year")
      .order("month");
    if (error) throw error;
    return data as CreditCardBill[];
  },

  async findOrCreateBill(cardId: string, month: number, year: number): Promise<CreditCardBill> {
    const supabase = createClient();
    // Try to find existing
    const { data: existing } = await supabase
      .from("credit_card_bills")
      .select("*")
      .eq("card_id", cardId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (existing) return existing as CreditCardBill;

    const { data: created, error } = await supabase
      .from("credit_card_bills")
      .insert({ card_id: cardId, month, year, status: "open", total_amount: 0 })
      .select()
      .single();
    if (error) throw error;

    // Fatura nova: replica recorrentes da fatura mais recente do passado.
    // Garante que ao lançar em um mês "zerado" distante, a recorrência também
    // apareça lá. Falhas no seed (ex.: RLS de couple) não bloqueiam a criação
    // da fatura — só perdem a recorrência específica.
    try {
      await this.seedRecurringInNewBill(cardId, created as CreditCardBill);
    } catch (e) {
      console.warn("Failed to seed recurring transactions:", e);
    }

    return created as CreditCardBill;
  },

  /**
   * Copia em `newBill` o conjunto de recorrentes ativos no passado deste
   * cartão. Para cada `recurring_group_id`/usuário, pega o lançamento da
   * fatura mais recente anterior a `newBill` e clona ali. Datas são
   * deslocadas para o mês de destino (com clamp no último dia).
   */
  async seedRecurringInNewBill(cardId: string, newBill: CreditCardBill): Promise<void> {
    const supabase = createClient();

    const { data: candidates } = await supabase
      .from("credit_card_transactions")
      .select("*, bill:credit_card_bills!inner(month, year)")
      .eq("card_id", cardId)
      .eq("is_recurring", true)
      .is("deleted_at", null);

    if (!candidates || candidates.length === 0) return;

    const newKey = newBill.year * 12 + (newBill.month - 1);

    // Para cada (recurring_group_id, user_id) pega a instância mais recente
    // estritamente anterior ao mês da nova fatura.
    type Candidate = {
      id: string;
      user_id: string;
      couple_id: string | null;
      title: string;
      description: string | null;
      amount: number;
      category_id: string | null;
      date: string;
      is_shared: boolean;
      shared_group_id: string | null;
      recurring_group_id: string | null;
      bill: { month: number; year: number };
    };

    const latestPerKey = new Map<string, Candidate>();
    for (const raw of candidates as unknown as Candidate[]) {
      if (!raw.recurring_group_id) continue;
      const txKey = raw.bill.year * 12 + (raw.bill.month - 1);
      if (txKey >= newKey) continue; // só passado estrito
      const mapKey = `${raw.recurring_group_id}:${raw.user_id}`;
      const existing = latestPerKey.get(mapKey);
      const existingKey = existing
        ? existing.bill.year * 12 + (existing.bill.month - 1)
        : -Infinity;
      if (txKey > existingKey) latestPerKey.set(mapKey, raw);
    }

    if (latestPerKey.size === 0) return;

    let inserted = false;
    for (const src of latestPerKey.values()) {
      const { error } = await supabase.from("credit_card_transactions").insert({
        bill_id: newBill.id,
        card_id: cardId,
        user_id: src.user_id,
        couple_id: src.couple_id,
        title: src.title,
        description: src.description,
        amount: src.amount,
        category_id: src.category_id,
        date: shiftDateToMonth(src.date, newBill.year, newBill.month),
        is_installment: false,
        installment_number: 1,
        installment_total: 1,
        is_last_installment: true,
        is_shared: src.is_shared,
        shared_group_id: src.shared_group_id,
        is_forecast: true,
        is_recurring: true,
        recurring_group_id: src.recurring_group_id,
      });
      if (error) {
        console.warn("Failed to clone recurring tx into new bill:", error.message);
      } else {
        inserted = true;
      }
    }

    if (inserted) await this.recalculateBillTotal(newBill.id);
  },

  /**
   * Replica em todas as faturas EXISTENTES estritamente posteriores a
   * (sourceMonth/sourceYear) deste cartão um lançamento recorrente já criado
   * (descrito em `source`). Cada cópia herda o mesmo recurring_group_id e
   * tem a data deslocada para o mês de destino.
   *
   * Aceita N "linhas" por fatura (1 normal, 2 quando dividido com casal).
   */
  async propagateRecurringToFutureBills(
    cardId: string,
    sourceMonth: number,
    sourceYear: number,
    rows: Array<{
      user_id: string;
      couple_id: string | null;
      title: string;
      description: string | null;
      amount: number;
      category_id: string | null;
      date: string;
      is_shared: boolean;
      shared_group_id: string | null;
      is_forecast: boolean;
      recurring_group_id: string;
    }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    const supabase = createClient();

    const sourceKey = sourceYear * 12 + (sourceMonth - 1);

    const { data: futureBills } = await supabase
      .from("credit_card_bills")
      .select("id, month, year")
      .eq("card_id", cardId);

    const targets = (futureBills ?? []).filter(
      (b) => b.year * 12 + (b.month - 1) > sourceKey,
    );

    if (targets.length === 0) return;

    const billsTouched = new Set<string>();
    for (const bill of targets) {
      let inserted = false;
      for (const row of rows) {
        const { error } = await supabase.from("credit_card_transactions").insert({
          bill_id: bill.id,
          card_id: cardId,
          user_id: row.user_id,
          couple_id: row.couple_id,
          title: row.title,
          description: row.description,
          amount: row.amount,
          category_id: row.category_id,
          date: shiftDateToMonth(row.date, bill.year, bill.month),
          is_installment: false,
          installment_number: 1,
          installment_total: 1,
          is_last_installment: true,
          is_shared: row.is_shared,
          shared_group_id: row.shared_group_id,
          is_forecast: true,
          is_recurring: true,
          recurring_group_id: row.recurring_group_id,
        });
        if (error) {
          console.warn("Failed to propagate recurring tx:", error.message);
        } else {
          inserted = true;
        }
      }
      if (inserted) billsTouched.add(bill.id);
    }

    for (const billId of billsTouched) {
      await this.recalculateBillTotal(billId);
    }
  },

  async updateBillStatus(billId: string, status: CreditCardBill["status"]) {
    const supabase = createClient();
    const { error } = await supabase
      .from("credit_card_bills")
      .update({ status })
      .eq("id", billId);
    if (error) throw error;
  },

  async recalculateBillTotal(billId: string) {
    const supabase = createClient();

    // Resolve the card owner so we can split amounts per user
    const { data: billRow } = await supabase
      .from("credit_card_bills")
      .select("card_id")
      .eq("id", billId)
      .single();

    const { data: cardRow } = await supabase
      .from("credit_cards")
      .select("user_id")
      .eq("id", billRow?.card_id ?? "")
      .single();

    const ownerId = cardRow?.user_id ?? null;

    const { data } = await supabase
      .from("credit_card_transactions")
      .select("amount, user_id")
      .eq("bill_id", billId)
      .is("deleted_at", null)
      .eq("is_reimbursed", false);

    let total = 0, ownerAmount = 0, partnerAmount = 0;
    for (const tx of data ?? []) {
      total += tx.amount;
      if (ownerId && tx.user_id === ownerId) ownerAmount += tx.amount;
      else partnerAmount += tx.amount;
    }

    await supabase
      .from("credit_card_bills")
      .update({ total_amount: total, owner_amount: ownerAmount, partner_amount: partnerAmount })
      .eq("id", billId);
  },

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getBillTransactions(billId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_card_transactions")
      .select("*, category:categories(id,name,color,icon)")
      .eq("bill_id", billId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as CreditCardTransaction[];
  },

  async createTransaction(
    input: CardTransactionInput,
    cardId: string,
    billMonth: number,
    billYear: number,
    userId: string,
    coupleId: string | null
  ) {
    const { is_installment, installment_total, start_month, is_recurring, ...base } = input;

    if (is_installment && installment_total > 1) {
      const installmentGroupId = crypto.randomUUID();
      const perAmount = +(input.amount / installment_total).toFixed(2);
      const billsUpdated = new Set<string>();

      // Índice absoluto do mês da primeira parcela.
      // start_month ("YYYY-MM") permite começar em um mês anterior ao da
      // fatura atual ("parcela antiga"); sem ele, começa na própria fatura.
      let firstYear = billYear;
      let firstMonth = billMonth;
      if (start_month) {
        const [sy, sm] = start_month.split("-").map(Number);
        firstYear = sy;
        firstMonth = sm;
      }
      const startIndex = firstYear * 12 + (firstMonth - 1);

      for (let i = 1; i <= installment_total; i++) {
        const monthIndex = startIndex + (i - 1);
        const targetYear = Math.floor(monthIndex / 12);
        const targetMonth = (monthIndex % 12) + 1;

        const bill = await this.findOrCreateBill(cardId, targetMonth, targetYear);

        const supabase = createClient();
        const { error } = await supabase.from("credit_card_transactions").insert({
          bill_id: bill.id,
          card_id: cardId,
          user_id: userId,
          couple_id: coupleId,
          title: base.title,
          description: base.description ?? null,
          amount: perAmount,
          category_id: base.category_id ?? null,
          date: base.date,
          is_installment: true,
          installment_group_id: installmentGroupId,
          installment_number: i,
          installment_total,
          is_last_installment: i === installment_total,
          is_shared: base.is_shared,
          is_forecast: base.is_forecast,
        });
        if (error) throw error;
        billsUpdated.add(bill.id);
      }

      for (const billId of billsUpdated) {
        await this.recalculateBillTotal(billId);
      }
    } else {
      const bill = await this.findOrCreateBill(cardId, billMonth, billYear);
      const supabase = createClient();
      const recurringGroupId = is_recurring ? crypto.randomUUID() : null;
      const { error } = await supabase.from("credit_card_transactions").insert({
        bill_id: bill.id,
        card_id: cardId,
        user_id: userId,
        couple_id: coupleId,
        title: base.title,
        description: base.description ?? null,
        amount: base.amount,
        category_id: base.category_id ?? null,
        date: base.date,
        is_installment: false,
        installment_number: 1,
        installment_total: 1,
        is_last_installment: true,
        is_shared: base.is_shared,
        is_forecast: base.is_forecast,
        is_recurring: !!is_recurring,
        recurring_group_id: recurringGroupId,
      });
      if (error) throw error;
      await this.recalculateBillTotal(bill.id);

      if (is_recurring && recurringGroupId) {
        await this.propagateRecurringToFutureBills(cardId, billMonth, billYear, [
          {
            user_id: userId,
            couple_id: coupleId,
            title: base.title,
            description: base.description ?? null,
            amount: base.amount,
            category_id: base.category_id ?? null,
            date: base.date,
            is_shared: base.is_shared,
            shared_group_id: null,
            is_forecast: base.is_forecast,
            recurring_group_id: recurringGroupId,
          },
        ]);
      }
    }
  },

  async splitTransaction(
    input: CardTransactionInput,
    cardId: string,
    billMonth: number,
    billYear: number,
    userId: string,
    partnerId: string,
    coupleId: string
  ) {
    const { is_installment, installment_total, start_month } = input;
    const sharedGroupId = crypto.randomUUID();

    if (is_installment && installment_total > 1) {
      const installmentGroupId = crypto.randomUUID();
      const perInstallment = +(input.amount / installment_total).toFixed(2);
      const half = +(perInstallment / 2).toFixed(2);
      const billsUpdated = new Set<string>();

      let firstYear = billYear;
      let firstMonth = billMonth;
      if (start_month) {
        const [sy, sm] = start_month.split("-").map(Number);
        firstYear = sy;
        firstMonth = sm;
      }
      const startIndex = firstYear * 12 + (firstMonth - 1);

      for (let i = 1; i <= installment_total; i++) {
        const monthIndex = startIndex + (i - 1);
        const targetYear = Math.floor(monthIndex / 12);
        const targetMonth = (monthIndex % 12) + 1;

        const bill = await this.findOrCreateBill(cardId, targetMonth, targetYear);

        const base = {
          bill_id: bill.id,
          card_id: cardId,
          couple_id: coupleId,
          title: input.title,
          description: input.description ?? null,
          amount: half,
          category_id: input.category_id ?? null,
          date: input.date,
          is_installment: true,
          installment_group_id: installmentGroupId,
          installment_number: i,
          installment_total,
          is_last_installment: i === installment_total,
          is_shared: true,
          shared_group_id: sharedGroupId,
          is_forecast: input.is_forecast,
        };

        const supabase = createClient();
        const { error } = await supabase.from("credit_card_transactions").insert([
          { ...base, user_id: userId },
          { ...base, user_id: partnerId },
        ]);
        if (error) throw error;
        billsUpdated.add(bill.id);
      }

      for (const billId of billsUpdated) {
        await this.recalculateBillTotal(billId);
      }
    } else {
      const bill = await this.findOrCreateBill(cardId, billMonth, billYear);
      const half = +(input.amount / 2).toFixed(2);
      const recurringGroupId = input.is_recurring ? crypto.randomUUID() : null;

      const base = {
        bill_id: bill.id,
        card_id: cardId,
        couple_id: coupleId,
        title: input.title,
        description: input.description ?? null,
        amount: half,
        category_id: input.category_id ?? null,
        date: input.date,
        is_installment: false,
        installment_number: 1,
        installment_total: 1,
        is_last_installment: true,
        is_shared: true,
        shared_group_id: sharedGroupId,
        is_forecast: input.is_forecast,
        is_recurring: !!input.is_recurring,
        recurring_group_id: recurringGroupId,
      };

      const supabase = createClient();
      const { error } = await supabase.from("credit_card_transactions").insert([
        { ...base, user_id: userId },
        { ...base, user_id: partnerId },
      ]);
      if (error) throw error;
      await this.recalculateBillTotal(bill.id);

      if (input.is_recurring && recurringGroupId) {
        const futureRow = {
          couple_id: coupleId,
          title: input.title,
          description: input.description ?? null,
          amount: half,
          category_id: input.category_id ?? null,
          date: input.date,
          is_shared: true,
          shared_group_id: sharedGroupId,
          is_forecast: input.is_forecast,
          recurring_group_id: recurringGroupId,
        };
        await this.propagateRecurringToFutureBills(cardId, billMonth, billYear, [
          { ...futureRow, user_id: userId },
          { ...futureRow, user_id: partnerId },
        ]);
      }
    }
  },

  async updateTransactionForecast(id: string, isForecast: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("credit_card_transactions")
      .update({ is_forecast: isForecast })
      .eq("id", id);
    if (error) throw error;
  },

  async updateTransactionReimbursed(id: string, billId: string, isReimbursed: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("credit_card_transactions")
      .update({ is_reimbursed: isReimbursed })
      .eq("id", id);
    if (error) throw error;
    await this.recalculateBillTotal(billId);
  },

  async updateTransaction(id: string, billId: string, input: CardTransactionEditInput) {
    const supabase = createClient();
    const { error } = await supabase
      .from("credit_card_transactions")
      .update({
        title: input.title,
        description: input.description ?? null,
        amount: input.amount,
        category_id: input.category_id ?? null,
        date: input.date,
        is_forecast: input.is_forecast,
        is_reimbursed: input.is_reimbursed,
      })
      .eq("id", id);
    if (error) throw error;
    await this.recalculateBillTotal(billId);
  },

  async deleteTransaction(id: string, billId: string) {
    const supabase = createClient();
    // SECURITY DEFINER RPC bypasses the RLS UPDATE+SELECT conflict and
    // recalculates total_amount. We then resync owner/partner amounts.
    const { error } = await supabase.rpc("soft_delete_card_transaction", {
      p_transaction_id: id,
    });
    if (error) throw error;
    if (billId) await this.recalculateBillTotal(billId);
  },

  async deleteInstallmentGroup(groupId: string) {
    const supabase = createClient();

    // Collect all affected bill IDs before the RPC wipes the rows
    const { data: txRows } = await createClient()
      .from("credit_card_transactions")
      .select("bill_id")
      .eq("installment_group_id", groupId)
      .is("deleted_at", null);

    const billIds = [...new Set((txRows ?? []).map((t) => t.bill_id as string))];

    // RPC handles soft-delete of all installments and recalculates total_amount
    const { error } = await supabase.rpc("soft_delete_card_installment_group", {
      p_group_id: groupId,
    });
    if (error) throw error;

    // Resync owner/partner amounts for every affected bill
    for (const billId of billIds) {
      await this.recalculateBillTotal(billId);
    }
  },

  // ─── Dashboard summary ────────────────────────────────────────────────────

  async getCardCategoryBreakdown(
    userId: string,
    coupleId: string | null,
    month: number,
    year: number,
    isShared = false,
  ) {
    const supabase = createClient();

    let query = supabase
      .from("credit_card_transactions")
      .select(
        "amount, category:categories(id,name,color,icon), bill:credit_card_bills!inner(month,year)",
      )
      .is("deleted_at", null)
      .eq("is_reimbursed", false)
      .eq("bill.month", month)
      .eq("bill.year", year);

    if (isShared && coupleId) {
      // Modo casal consolidado: a RLS já restringe às transações de cartão dos
      // dois parceiros, então não filtramos por usuário.
    } else {
      // Modo individual: apenas lançamentos do próprio usuário.
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    type Row = {
      amount: number;
      category: { id: string; name: string; color: string } | null;
    };

    const grouped: Record<string, { name: string; value: number; color: string }> = {};
    for (const t of (data ?? []) as unknown as Row[]) {
      const catName = t.category?.name ?? "Sem categoria";
      const catId = t.category?.id ?? "none";
      if (!grouped[catId]) {
        grouped[catId] = { name: catName, value: 0, color: t.category?.color ?? "#6366f1" };
      }
      grouped[catId].value += t.amount;
    }

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  },

  /**
   * Expense de cartão por mês para os últimos `months` meses.
   * - Individual: soma da minha parte (owner_amount ou partner_amount).
   * - Casal: soma do total da fatura de cada cartão visível.
   */
  async getCardsCashFlow(
    userId: string,
    coupleId: string | null,
    months = 6,
    isShared = false,
  ) {
    const supabase = createClient();

    const monthKeys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthKeys.push(d.toISOString().slice(0, 7));
    }

    const cards = await this.getCards(userId, coupleId, isShared, isShared);
    if (cards.length === 0) {
      return monthKeys.map((m) => ({ month: m, expense: 0 }));
    }
    const cardById = new Map(cards.map((c) => [c.id, c]));

    const { data, error } = await supabase
      .from("credit_card_bills")
      .select("card_id, month, year, total_amount, owner_amount, partner_amount")
      .in("card_id", Array.from(cardById.keys()));
    if (error) throw error;

    const byMonth: Record<string, number> = {};
    for (const k of monthKeys) byMonth[k] = 0;

    for (const bill of data ?? []) {
      const key = `${bill.year}-${String(bill.month).padStart(2, "0")}`;
      if (!(key in byMonth)) continue;
      const card = cardById.get(bill.card_id);
      if (!card) continue;

      const amount =
        isShared && coupleId
          ? bill.total_amount ?? 0
          : card.user_id === userId
            ? bill.owner_amount ?? bill.total_amount ?? 0
            : bill.partner_amount ?? 0;

      byMonth[key] += amount;
    }

    return monthKeys.map((m) => ({ month: m, expense: byMonth[m] }));
  },

  async getCardsSummary(userId: string, coupleId: string | null, month: number, year: number, isShared = false) {
    const supabase = createClient();

    const cards = await this.getCards(userId, coupleId, isShared, isShared);

    const summary = await Promise.all(
      cards.map(async (card) => {
        const { data } = await supabase
          .from("credit_card_bills")
          .select("total_amount, owner_amount, partner_amount, status")
          .eq("card_id", card.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();

        // Casal: fatura cheia (soma dos dois parceiros). Individual: usa os
        // valores por usuário já calculados, evitando varrer transações.
        // Fallback para total_amount em faturas anteriores às novas colunas.
        const monthTotal = data
          ? isShared && coupleId
            ? (data.total_amount ?? 0)
            : card.user_id === userId
              ? (data.owner_amount ?? data.total_amount)
              : (data.partner_amount ?? 0)
          : 0;

        return {
          card,
          monthTotal,
          billStatus: data?.status ?? null,
        };
      })
    );

    return summary;
  },
};
