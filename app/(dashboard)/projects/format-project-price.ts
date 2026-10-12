import { formatCurrency } from "@/lib/format-currency";

/** "$500" for a fixed price, "~$1,500" for an hourly estimate, "Hourly" with none. */
export function formatProjectPrice(project: {
  pricing: "fixed" | "hourly";
  budget: string;
  currency: string;
}): string {
  if (project.pricing === "fixed") {
    return formatCurrency(project.budget, project.currency);
  }
  return Number(project.budget) > 0
    ? `~${formatCurrency(project.budget, project.currency)}`
    : "Hourly";
}
