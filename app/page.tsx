import ComingSoon from "@/components/comings-soon";
import { getWaitlistCount } from "@/app/actions/waitlist";

// Without this, Next prerenders this page once at build time (no request-time
// data is read otherwise) and the waitlist count freezes at whatever it was
// during that build — every real signup afterward would go uncounted on the
// page. A public marketing page doesn't need a DB hit on every single
// visitor either, so this revalidates on a timer instead of forcing fully
// dynamic rendering.
export const revalidate = 60;

// Server Component: reads the real signup count and hands it down as a
// prop, so the landing page's "N freelancers waiting" line is never a
// made-up marketing number.
export default async function Home() {
  const waitlistCount = await getWaitlistCount();
  return <ComingSoon waitlistCount={waitlistCount} />;
}
