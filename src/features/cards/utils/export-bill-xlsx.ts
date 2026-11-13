// Exportação da fatura do cartão para XLSX, 100% client-side.
//
// Layout de uma aba só, pensado para ler de cima para baixo:
//   1. Cabeçalho: cartão, mês/ano, visão exportada, status e filtros.
//   2. Resumo: total da fatura consolidada (realizado), previsões e total com
//      previsões — da fatura inteira e por pessoa.
//   3. Gastos por categoria, com as mesmas três colunas.
//   4. Lançamentos da visão (detalhada ou consolidada): Nome, Valor, Data,
//      A quem pertence + Categoria e Situação para dar contexto.
//
// O resumo e as categorias são sempre da fatura inteira (iguais nas duas
// visões); a lista de lançamentos é a que o usuário está vendo na tela.
// Reembolsados ficam fora dos totais, como no cabeçalho da fatura.
//
// O exceljs (~1 MB) é carregado sob demanda no clique, para não pesar o
// bundle da tela de cartões.

import type { Workbook, Worksheet, Row, Fill } from "exceljs";
import type { CreditCardTransaction } from "../types";

export type BillExportView = "detailed" | "consolidated";

export type BillExportPerson = { id: string; name: string };

export type BillExportInput = {
  cardName: string;
  /** Ex.: "Novembro". */
  monthLabel: string;
  month: number;
  year: number;
  view: BillExportView;
  /** Rótulo do status da fatura (Aberta, Fechada…), quando existir. */
  statusLabel?: string | null;
  /** Todos os lançamentos da fatura, sem filtro — base do resumo. */
  transactions: CreditCardTransaction[];
  /** Lançamentos já na forma da visão (filtrados/consolidados). */
  rows: CreditCardTransaction[];
  /** Descrição dos filtros/busca aplicados à lista, se houver. */
  filterLabel?: string | null;
  /** Pessoas conhecidas (usuário logado e parceiro), para nomear os donos. */
  people: BillExportPerson[];
};

const CURRENCY_FMT = '"R$" #,##0.00;-"R$" #,##0.00';
const DATE_FMT = "dd/mm/yyyy";
const PERCENT_FMT = "0.0%";
const COLUMN_COUNT = 6;

const COLOR = {
  title: "FF1F2937",
  muted: "FF6B7280",
  headerBg: "FF1F2937",
  headerFg: "FFFFFFFF",
  sectionFg: "FF4F46E5",
  totalBg: "FFF3F4F6",
  border: "FFD1D5DB",
  forecast: "FFC2410C",
  reimbursed: "FF9CA3AF",
};

const solid = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

type Totals = { realized: number; forecast: number };

const sumTotals = (t: Totals) => t.realized + t.forecast;

function addTo(map: Map<string, Totals>, key: string, tx: CreditCardTransaction) {
  const entry = map.get(key) ?? { realized: 0, forecast: 0 };
  if (tx.is_forecast) entry.forecast += tx.amount;
  else entry.realized += tx.amount;
  map.set(key, entry);
}

/** "YYYY-MM-DD" → Date em UTC, para o Excel gravar exatamente o mesmo dia. */
function toExcelDate(iso: string): Date | string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cartao";
}

function situationOf(tx: CreditCardTransaction, consolidated: boolean): string {
  const tags: string[] = [];
  if (tx.is_forecast) tags.push("Previsão");
  if (tx.is_installment) {
    tags.push(
      tx.is_last_installment
        ? `Última parcela ${tx.installment_number}/${tx.installment_total}`
        : `Parcela ${tx.installment_number}/${tx.installment_total}`,
    );
  }
  if (tx.is_recurring) tags.push("Recorrente");
  if (tx.is_shared) tags.push(consolidated ? "Dividido (valor cheio)" : "Dividido");
  if (tx.is_reimbursed) tags.push("Reembolsado (fora do total)");
  return tags.join(" · ");
}

function styleTableHeader(row: Row, columns: number) {
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLOR.headerFg } };
    cell.fill = solid(COLOR.headerBg);
    cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center" };
    cell.border = { bottom: { style: "thin", color: { argb: COLOR.border } } };
  }
  row.height = 20;
}

function styleTotalRow(row: Row, columns: number) {
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c);
    cell.font = { ...cell.font, bold: true };
    cell.fill = solid(COLOR.totalBg);
    cell.border = { top: { style: "thin", color: { argb: COLOR.border } } };
  }
}

function addSectionTitle(ws: Worksheet, text: string, note?: string) {
  ws.addRow([]);
  const row = ws.addRow([text]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: COLOR.sectionFg } };
  if (note) {
    const noteRow = ws.addRow([note]);
    noteRow.getCell(1).font = { italic: true, size: 9, color: { argb: COLOR.muted } };
  }
}

function addInfoRow(ws: Worksheet, label: string, value: string) {
  const row = ws.addRow([label, value]);
  row.getCell(1).font = { bold: true, color: { argb: COLOR.muted } };
  ws.mergeCells(row.number, 2, row.number, COLUMN_COUNT);
}

export function buildBillFileName(input: Pick<BillExportInput, "cardName" | "month" | "year" | "view">) {
  const mm = String(input.month).padStart(2, "0");
  const view = input.view === "consolidated" ? "consolidada" : "detalhada";
  return `fatura-${slugify(input.cardName)}-${input.year}-${mm}-${view}.xlsx`;
}

export async function buildBillWorkbook(input: BillExportInput): Promise<Workbook> {
  const mod = await import("exceljs");
  // O build de browser do exceljs é UMD: dependendo do bundler a classe vem no
  // default ou direto no namespace.
  const { Workbook: WorkbookClass } = mod.default ?? mod;

  const consolidated = input.view === "consolidated";
  const nameById = new Map(input.people.map((p) => [p.id, p.name]));
  const ownerName = (userId: string) => nameById.get(userId) ?? "Outro usuário";

  // Donos de cada lançamento dividido — na visão consolidada as duas metades
  // viram uma linha só e a coluna "A quem pertence" mostra os dois.
  const sharedOwners = new Map<string, Set<string>>();
  for (const tx of input.transactions) {
    if (tx.is_shared && tx.shared_group_id) {
      const set = sharedOwners.get(tx.shared_group_id) ?? new Set<string>();
      set.add(tx.user_id);
      sharedOwners.set(tx.shared_group_id, set);
    }
  }
  const belongsTo = (tx: CreditCardTransaction) => {
    if (consolidated && tx.is_shared && tx.shared_group_id) {
      const owners = Array.from(sharedOwners.get(tx.shared_group_id) ?? [tx.user_id]);
      if (owners.length > 1) return `Dividido (${owners.map(ownerName).join(" e ")})`;
    }
    return ownerName(tx.user_id);
  };

  // ── Agregações da fatura inteira (reembolsados fora) ──────────────────────
  const billTotals: Totals = { realized: 0, forecast: 0 };
  const byPerson = new Map<string, Totals>();
  const byCategory = new Map<string, Totals & { name: string }>();
  let reimbursedTotal = 0;

  for (const tx of input.transactions) {
    if (tx.is_reimbursed) {
      reimbursedTotal += tx.amount;
      continue;
    }
    if (tx.is_forecast) billTotals.forecast += tx.amount;
    else billTotals.realized += tx.amount;

    addTo(byPerson, tx.user_id, tx);

    const catKey = tx.category?.id ?? "__none__";
    const cat = byCategory.get(catKey) ?? {
      name: tx.category?.name ?? "Sem categoria",
      realized: 0,
      forecast: 0,
    };
    if (tx.is_forecast) cat.forecast += tx.amount;
    else cat.realized += tx.amount;
    byCategory.set(catKey, cat);
  }

  // Pessoas conhecidas sempre aparecem (mesmo zeradas) quando há casal; donos
  // desconhecidos (ex.: ex-parceiro) entram no fim.
  const personIds = [
    ...input.people.map((p) => p.id),
    ...Array.from(byPerson.keys()).filter((id) => !nameById.has(id)),
  ];

  // ── Planilha ──────────────────────────────────────────────────────────────
  const wb = new WorkbookClass();
  wb.creator = "finTrackerDuo";
  wb.created = new Date();

  const sheetName = `Fatura ${input.monthLabel.slice(0, 3)}-${input.year}`;
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  });
  ws.columns = [
    { width: 42 }, // Nome / rótulos
    { width: 22 }, // Valor / realizado
    { width: 16 }, // Data / previsões
    { width: 26 }, // A quem pertence / total c/ previsões
    { width: 20 }, // Categoria / %
    { width: 34 }, // Situação
  ];

  // 1. Cabeçalho
  const title = ws.addRow([`Fatura ${input.cardName} — ${input.monthLabel}/${input.year}`]);
  title.getCell(1).font = { bold: true, size: 16, color: { argb: COLOR.title } };
  title.height = 26;
  ws.mergeCells(title.number, 1, title.number, COLUMN_COUNT);

  addInfoRow(ws, "Cartão", input.cardName);
  addInfoRow(ws, "Mês/Ano", `${input.monthLabel} de ${input.year}`);
  addInfoRow(
    ws,
    "Visão exportada",
    consolidated
      ? "Consolidada — sem previsões; lançamentos divididos com o casal unidos em uma linha"
      : "Detalhada — inclui previsões; lançamentos divididos aparecem por pessoa",
  );
  if (input.statusLabel) addInfoRow(ws, "Status da fatura", input.statusLabel);
  if (input.filterLabel) addInfoRow(ws, "Filtro da lista", input.filterLabel);
  addInfoRow(
    ws,
    "Gerado em",
    new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
  );

  // 2. Resumo
  addSectionTitle(
    ws,
    "Resumo da fatura",
    reimbursedTotal > 0
      ? "Reembolsos ficam fora dos totais."
      : "Fatura consolidada = lançamentos realizados, sem previsões.",
  );
  const summaryHeader = ws.addRow(["", "Fatura consolidada", "Previsões", "Total com previsões"]);
  styleTableHeader(summaryHeader, 4);

  const addSummaryRow = (label: string, t: Totals, isTotal = false) => {
    const row = ws.addRow([label, t.realized, t.forecast, sumTotals(t)]);
    for (let c = 2; c <= 4; c++) row.getCell(c).numFmt = CURRENCY_FMT;
    if (isTotal) styleTotalRow(row, 4);
    return row;
  };

  addSummaryRow("Total da fatura", billTotals, true);
  const showPeople = personIds.length > 1 || personIds.some((id) => !nameById.has(id));
  if (showPeople) {
    for (const id of personIds) {
      addSummaryRow(`Parte de ${ownerName(id)}`, byPerson.get(id) ?? { realized: 0, forecast: 0 });
    }
  }
  if (reimbursedTotal > 0) {
    const row = ws.addRow(["Reembolsados (fora do total)", reimbursedTotal]);
    row.getCell(1).font = { italic: true, color: { argb: COLOR.muted } };
    row.getCell(2).numFmt = CURRENCY_FMT;
    row.getCell(2).font = { italic: true, color: { argb: COLOR.muted } };
  }

  // 3. Gastos por categoria
  const shareBase = consolidated ? billTotals.realized : sumTotals(billTotals);
  addSectionTitle(
    ws,
    "Gastos por categoria",
    consolidated
      ? "% calculado sobre a fatura consolidada (sem previsões)."
      : "% calculado sobre o total com previsões.",
  );
  const catHeader = ws.addRow(["Categoria", "Fatura consolidada", "Previsões", "Total com previsões", "% da fatura"]);
  styleTableHeader(catHeader, 5);

  const categories = Array.from(byCategory.values()).sort((a, b) =>
    consolidated ? b.realized - a.realized || sumTotals(b) - sumTotals(a) : sumTotals(b) - sumTotals(a),
  );
  if (categories.length === 0) {
    const row = ws.addRow(["Nenhum gasto nesta fatura"]);
    row.getCell(1).font = { italic: true, color: { argb: COLOR.muted } };
  }
  for (const cat of categories) {
    const base = consolidated ? cat.realized : sumTotals(cat);
    const row = ws.addRow([cat.name, cat.realized, cat.forecast, sumTotals(cat), shareBase > 0 ? base / shareBase : 0]);
    for (let c = 2; c <= 4; c++) row.getCell(c).numFmt = CURRENCY_FMT;
    row.getCell(5).numFmt = PERCENT_FMT;
  }
  if (categories.length > 0) {
    const row = ws.addRow(["Total", billTotals.realized, billTotals.forecast, sumTotals(billTotals), shareBase > 0 ? 1 : 0]);
    for (let c = 2; c <= 4; c++) row.getCell(c).numFmt = CURRENCY_FMT;
    row.getCell(5).numFmt = PERCENT_FMT;
    styleTotalRow(row, 5);
  }

  // 4. Lançamentos
  addSectionTitle(
    ws,
    consolidated ? "Lançamentos — visão consolidada" : "Lançamentos — visão detalhada",
    consolidated
      ? "Sem previsões; lançamentos divididos aparecem com o valor cheio."
      : "Previsões em laranja; reembolsados em cinza.",
  );
  const listHeader = ws.addRow(["Nome", "Valor", "Data", "A quem pertence", "Categoria", "Situação"]);
  styleTableHeader(listHeader, COLUMN_COUNT);
  const firstDataRow = listHeader.number + 1;

  if (input.rows.length === 0) {
    const row = ws.addRow(["Nenhum lançamento nesta visão"]);
    row.getCell(1).font = { italic: true, color: { argb: COLOR.muted } };
  }

  let listedTotal = 0;
  for (const tx of input.rows) {
    if (!tx.is_reimbursed) listedTotal += tx.amount;
    const row = ws.addRow([
      tx.title,
      tx.amount,
      toExcelDate(tx.date),
      belongsTo(tx),
      tx.category?.name ?? "Sem categoria",
      situationOf(tx, consolidated),
    ]);
    row.getCell(2).numFmt = CURRENCY_FMT;
    row.getCell(3).numFmt = DATE_FMT;
    row.getCell(3).alignment = { horizontal: "center" };

    const color = tx.is_reimbursed ? COLOR.reimbursed : tx.is_forecast ? COLOR.forecast : undefined;
    if (color) {
      for (let c = 1; c <= COLUMN_COUNT; c++) {
        row.getCell(c).font = { color: { argb: color }, strike: tx.is_reimbursed && c === 2 };
      }
    }
  }
  const lastDataRow = firstDataRow + input.rows.length - 1;

  if (input.rows.length > 0) {
    ws.autoFilter = {
      from: { row: listHeader.number, column: 1 },
      to: { row: lastDataRow, column: COLUMN_COUNT },
    };
    const totalRow = ws.addRow([
      input.rows.some((t) => t.is_reimbursed) ? "Total listado (sem reembolsos)" : "Total listado",
      listedTotal,
    ]);
    totalRow.getCell(2).numFmt = CURRENCY_FMT;
    styleTotalRow(totalRow, COLUMN_COUNT);
  }

  return wb;
}

/** Gera o XLSX da fatura e dispara o download no navegador. */
export async function downloadBillXlsx(input: BillExportInput): Promise<void> {
  const wb = await buildBillWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildBillFileName(input);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoga depois do clique ser processado (alguns navegadores cancelam o
  // download se a URL some no mesmo tick).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
