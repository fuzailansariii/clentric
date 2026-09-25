import WelcomeHeader from "@/components/dashboard/welcome-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/current-user";
import { getDashboardData } from "../queries";

export default async function Dashboard() {
  const user = await requireUser();
  // Same cached read the dashboard layout already made this request.
  const { profile } = await getDashboardData(user.id);

  // First name only for the greeting; the email when no name is set.
  const name = profile?.name?.trim().split(/\s+/)[0] || user.email || "there";

  return (
    <div>
      <WelcomeHeader name={name} />
      <ThemeToggle />
    </div>
  );
}
