// PRD §6 — canonical TL formatter. All currency display must go through here.
// Format: "1,300 TL" — comma thousand-separator, no trailing zeros on integers.
export function formatTL(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} TL`;
}
