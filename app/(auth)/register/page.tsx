"use client";

import AuthBrandPanel from "@/components/auth-brand-panel";
import AuthForm from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { FileText, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { authErrorMessage } from "@/lib/auth-error-message";

export default function Register() {
  const router = useRouter();
  const supabase = createClient();

  // handlers

  // Registration form submit handler
  const onSubmitDetails = async (data: { name?: string; email: string }) => {
    const { email, name } = data;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: name },
      },
    });

    if (error) throw new Error(authErrorMessage(error));
  };

  // OTP Verification
  const onVerifyCode = async (code: string, email: string) => {
    // "email" covers both a brand-new account's code and a returning
    // user's, so this no longer tries "signup" and then "recovery".
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) throw new Error(authErrorMessage(error));
    router.replace("/dashboard");
    router.refresh();
  };

  // resend verification code
  // The account (and its name) was created by the first send.
  const onResendCode = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) throw new Error(authErrorMessage(error));
  };

  // OAuth handler
  const onOAuth = async (provider: "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  };

  return (
    <main className="flex min-h-screen">
      <div className="hidden lg:block lg:w-1/3">
        <AuthBrandPanel
          logo={<Logo className="h-7 self-start" />}
          trustBadge="Trusted By Many Freelancers."
          title="Everything your freelance business needs."
          description="One workspace for clients, projects, invoices, and proposals."
          features={[
            {
              icon: <Users className="size-4" />,
              title: "Client CRM",
              description: "Track relationships, contacts & notes",
              iconClassName:
                "bg-ledger-50 text-ledger-600 dark:bg-ledger-500/15 dark:text-ledger-500",
            },
            {
              icon: <FileText className="size-4" />,
              title: "Smart Invoicing",
              description: "Send, track, and get paid faster",
              iconClassName:
                "bg-success-100 text-success-600 dark:bg-success-600/15",
            },
            {
              icon: <TrendingUp className="size-4" />,
              title: "Revenue Analytics",
              description: "Know exactly where you stand",
              iconClassName: "bg-amber-100 text-amber-600 dark:bg-amber-600/15",
            },
          ]}
          // testimonial={{
          //   quote:
          //     "Workly replaced four tools I used to pay for. My invoicing time dropped to minutes.",
          //   initials: "MR",
          //   name: "Marcus R.",
          //   role: "Full-stack freelancer",
          // }}
          // trustBadge={<TrustBadge
          //   avatarUrls={[user1.avatarUrl, user2.avatarUrl, user3.avatarUrl, user4.avatarUrl]}
          //   count={realUserCount} // pull from your actual signups table, not a hardcoded number
          // />}
        />
      </div>

      <div className="flex flex-1 items-center justify-center">
        {/* Register form */}
        <AuthForm
          mode="register"
          switchHref="/login"
          onSubmitDetails={onSubmitDetails}
          onVerifyCode={onVerifyCode}
          onResendCode={onResendCode}
          onOAuth={onOAuth}
        />
      </div>
    </main>
  );
}
