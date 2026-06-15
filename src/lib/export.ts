// Exportação client-side de tabelas para CSV. Pensado para abrir limpo no
// Excel pt-BR: separador ";", decimal com vírgula e BOM UTF-8 (acentos).
// Reutilizável pelos relatórios (Fase 4).

// BOM UTF-8 (U+FEFF) para o Excel reconhecer acentos. Construído via charCode
// para não deixar um caractere invisível no fonte.
const BOM = String.fromCharCode(0xfeff);

function formatCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  }
  const s = String(value);
  // Escapa aspas e envolve o campo quando há separador/quebra/aspas.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const sep = ";";
  const lines = [
    headers.map(formatCell).join(sep),
    ...rows.map((r) => r.map(formatCell).join(sep)),
  ];
  const content = BOM + lines.join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
