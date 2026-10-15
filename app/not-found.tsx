import Link from "next/link";
import { Logo } from "@/components/logo";
import { customButtonClasses } from "@/components/ui/custom-button";

export default function NotFound() {
  return (
    <main className="bg-muted/30 text-foreground flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-16">
      <Link href="/" aria-label="Clentric home">
        <Logo className="h-7" />
      </Link>
      <div className="bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-sm">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
          404
        </p>
        <h1 className="font-space mt-3 text-xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm">
          The link may be wrong, or the page has moved.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={customButtonClasses("primary", "sm")}>
            Go to dashboard
          </Link>
          <Link href="/" className={customButtonClasses("secondary", "sm")}>
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
