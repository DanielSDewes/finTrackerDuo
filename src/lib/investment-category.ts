// "Investimento" é uma categoria de DESPESA semeada por padrão (ver
// supabase/schema.sql). Conceitualmente, porém, aplicar dinheiro não é "gasto"
// — é patrimônio mudando de lugar. Por isso os gráficos de fluxo de caixa a
// tratam como uma terceira série, separada das despesas comuns.
//
// O modelo de dados não tem uma flag dedicada para isso (o type 'investment'
// das categorias é legado/inerte), então o reconhecimento é por nome. Manter
// o nome aqui centralizado evita string mágica espalhada por services e charts.
export const INVESTMENT_CATEGORY_NAME = "Investimento";

// Cor da série de investimento nos gráficos. Igual à cor da categoria default
// no seed, para casar com a fatia/barra "Investimento" das pizzas e breakdowns.
export const INVESTMENT_CHART_COLOR = "#4f46e5";

/** True para a categoria de despesa que representa aporte/investimento. */
export function isInvestmentCategoryName(name?: string | null): boolean {
  return name === INVESTMENT_CATEGORY_NAME;
}
