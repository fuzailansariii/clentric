import ComingSoon from "@/components/comings-soon";
import { getWaitlistCount } from "@/app/actions/waitlist";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Only picks which header links to show; getClaims checks the JWT locally.
async function isSignedIn() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims);
  } catch {
    return false;
  }
}

export default async function Home() {
  const [waitlistCount, signedIn] = await Promise.all([
    getWaitlistCount(),
    isSignedIn(),
  ]);
  // UTC date, read on the server so pricing's dated tags match on hydration.
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ComingSoon
      waitlistCount={waitlistCount}
      today={today}
      signedIn={signedIn}
    />
  );
}
