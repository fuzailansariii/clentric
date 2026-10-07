import { requireUser } from "@/lib/current-user";
import { AccountCards } from "./account-cards";

export async function AccountSection() {
  // The auth email, not users.email: it's what the deletion action checks
  // the typed confirmation against.
  const user = await requireUser();

  return <AccountCards email={user.email ?? ""} />;
}
