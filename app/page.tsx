import ComingSoon from "@/components/comings-soon";
import { getWaitlistCount } from "@/app/actions/waitlist";

export const dynamic = "force-dynamic";

export default async function Home() {
  const waitlistCount = await getWaitlistCount();
  // UTC date, read on the server so pricing's dated tags match on hydration.
  const today = new Date().toISOString().slice(0, 10);
  return <ComingSoon waitlistCount={waitlistCount} today={today} />;
}
