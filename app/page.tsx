import ComingSoon from "@/components/comings-soon";
import { getWaitlistCount } from "@/app/actions/waitlist";

// Read the waitlist count on every request. Prerendering (even with
// revalidate) can bake a stale or failed count into the page at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const waitlistCount = await getWaitlistCount();
  return <ComingSoon waitlistCount={waitlistCount} />;
}
