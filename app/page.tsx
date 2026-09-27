import ComingSoon from "@/components/comings-soon";
import { getWaitlistCount } from "@/app/actions/waitlist";

export const dynamic = "force-dynamic";

export default async function Home() {
  const waitlistCount = await getWaitlistCount();
  return <ComingSoon waitlistCount={waitlistCount} />;
}
