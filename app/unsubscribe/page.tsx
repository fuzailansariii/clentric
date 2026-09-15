import UnsubscribeForm from "@/components/unsubscribe-form";

type UnsubscribePageProps = {
  // Lets a future confirmation email link straight to a prefilled form
  // (e.g. /unsubscribe?email=you@studio.com) without requiring a token —
  // the action itself never reveals whether an address was actually on
  // the list, so there's nothing sensitive in the link to protect.
  searchParams: Promise<{ email?: string }>;
};

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { email } = await searchParams;
  return <UnsubscribeForm initialEmail={email ?? ""} />;
}
