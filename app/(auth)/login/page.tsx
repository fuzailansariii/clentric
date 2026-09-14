"use client";
import AuthBrandPanel from "@/components/auth-brand-panel";
import AuthForm from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { FileText, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Login() {
  const emailRef = useRef("");
  const supabase = createClient();
  const router = useRouter();

  // email submit handler
  const onSubmitEmail = async (data: { email: string }) => {
    const { email } = data;
    emailRef.current = email;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      if (error.message.toLowerCase().includes("signups not allowed")) {
        throw new Error(
          "No account found with this email. Try creating one instead.",
        );
      }
      throw new Error(error.message);
    }
  };

  // OTP Verification
  const onVerifyCode = async (code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: emailRef.current,
      token: code,
      type: "recovery",
    });

    if (error) throw new Error(error.message);
    router.replace("/dashboard");
    router.refresh();
  };

  // resend verification code
  const onResendCode = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: emailRef.current,
      options: {
        shouldCreateUser: false,
      },
    });
    if (error) throw new Error(error.message);
  };

  // OAuth handler
  const onOAuth = async (provider: "google" | "github") => {
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
          logo={<Logo />}
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
        {/* Login form */}
        <AuthForm
          mode="login"
          switchHref="/register"
          onSubmitDetails={onSubmitEmail}
          onVerifyCode={onVerifyCode}
          onResendCode={onResendCode}
          onOAuth={onOAuth}
        />
      </div>
    </main>
  );
}
