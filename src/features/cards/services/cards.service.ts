import { createClient } from "@/lib/supabase/client";
import type { CreditCard, CreditCardBill, CreditCardTransaction } from "../types";
import type { CreditCardInput, CardTransactionInput } from "../schemas/card.schema";

function endOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
}

export const cardsService = {
  // ─── Cards ────────────────────────────────────────────────────────────────

  async getCards(userId: string, coupleId: string | null, isShared = false) {
    const supabase = createClient();
    let query = supabase
      .from("credit_cards")
      .select("*")
      .eq("is_active", true)
      .order("created_at");

    if (isShared && coupleId) {
      query = query.or(`user_id.eq.${userId},and(is_shared.eq.true,couple_id.eq.${coupleId})`);
    } else {
      query = query.eq("user_id", userId);
    }

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
    return created as CreditCardBill;
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
      .is("deleted_at", null);

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
    const { is_installment, installment_total, ...base } = input;

    if (is_installment && installment_total > 1) {
      const installmentGroupId = crypto.randomUUID();
      const perAmount = +(input.amount / installment_total).toFixed(2);
      const billsUpdated = new Set<string>();

      for (let i = 1; i <= installment_total; i++) {
        const rawMonth = billMonth + i - 2;
        const targetMonth = (((rawMonth % 12) + 12) % 12) + 1;
        const targetYear = billYear + Math.floor((billMonth + i - 2) / 12);

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
      });
      if (error) throw error;
      await this.recalculateBillTotal(bill.id);
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
    const { is_installment, installment_total } = input;
    const sharedGroupId = crypto.randomUUID();

    if (is_installment && installment_total > 1) {
      const installmentGroupId = crypto.randomUUID();
      const perInstallment = +(input.amount / installment_total).toFixed(2);
      const half = +(perInstallment / 2).toFixed(2);
      const billsUpdated = new Set<string>();

      for (let i = 1; i <= installment_total; i++) {
        const rawMonth = billMonth + i - 2;
        const targetMonth = (((rawMonth % 12) + 12) % 12) + 1;
        const targetYear = billYear + Math.floor((billMonth + i - 2) / 12);

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
      };

      const supabase = createClient();
      const { error } = await supabase.from("credit_card_transactions").insert([
        { ...base, user_id: userId },
        { ...base, user_id: partnerId },
      ]);
      if (error) throw error;
      await this.recalculateBillTotal(bill.id);
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

  async getCardsSummary(userId: string, coupleId: string | null, month: number, year: number, isShared = false) {
    const supabase = createClient();

    const cards = await this.getCards(userId, coupleId, isShared);

    const summary = await Promise.all(
      cards.map(async (card) => {
        const { data } = await supabase
          .from("credit_card_bills")
          .select("total_amount, owner_amount, partner_amount, status")
          .eq("card_id", card.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();

        // Use per-user stored amounts to avoid scanning all transactions.
        // Falls back to total_amount for bills created before the new columns existed.
        const userAmount = data
          ? card.user_id === userId
            ? (data.owner_amount ?? data.total_amount)
            : (data.partner_amount ?? 0)
          : 0;

        return {
          card,
          monthTotal: userAmount,
          billStatus: data?.status ?? null,
        };
      })
    );

    return summary;
  },
};
