import { PlanLimitPage } from "@/components/dashboard/plan-limit-page";
import { planBlockMessage } from "@/lib/plan-limits";
import { getSafeReturnTo } from "@/lib/return-to";
import { ClientForm } from "../client-form";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  // Set when opened from the dashboard's setup steps: go back there instead.
  const [{ returnTo: rawReturnTo }, blocked] = await Promise.all([
    searchParams,
    planBlockMessage("clients"),
  ]);
  if (blocked) {
    return (
      <PlanLimitPage title="New client" section="Clients" sectionHref="/clients" message={blocked} />
    );
  }
  const returnTo = getSafeReturnTo(rawReturnTo);
  return <ClientForm returnTo={returnTo} />;
}
