export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export const currentYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const ymRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  // occurred_at é gravado como meia-noite UTC do dia escolhido.
  // Usar limites em UTC evita que o fuso local (ex.: America/Sao_Paulo)
  // exclua o dia 1º do mês da contagem.
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
};
