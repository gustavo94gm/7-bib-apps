export const SITUATION_LABELS: Record<string, string> = {
  civil: "Civil",
  inativo_pensionista: "Inativo/Pensionista",
  militar_outra_om: "Militar de outra OM",
  militar_reserva: "Militar da reserva",
};

export function formatSituation(s: string | null) {
  return s ? (SITUATION_LABELS[s] ?? s) : "—";
}
