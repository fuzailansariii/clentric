"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import {
  verificationCode,
  loginSchema,
  registerSchema,
  type AuthFormValues,
} from "@/lib/validations/auth";
import { SubmitEvent, useEffect, useRef, useState } from "react";
import { Field } from "./ui/input";
import { CustomButton } from "./ui/custom-button";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { OtpInput, type OtpInputHandle } from "./otp-input";
import { useHydrated } from "@/hooks/use-hydrated";

type AuthFormProps = {
  mode: "login" | "register";
  onSubmitDetails: (data: { name?: string; email: string }) => Promise<void>;
  onVerifyCode: (code: string) => Promise<void>;
  onResendCode: () => Promise<void>;
  onOAuth: (provider: "google" | "github") => Promise<void>;
  switchHref: string;
};

const RESEND_SECONDS = 60;

export default function AuthForm({
  mode,
  onOAuth,
  onResendCode,
  onSubmitDetails,
  onVerifyCode,
  switchHref,
}: AuthFormProps) {
  const [step, setStep] = useState<"details" | "verify">("details");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<OtpInputHandle>(null);

  // hook
  const hydrated = useHydrated();

  // Resend code
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    const savedStep = sessionStorage.getItem(`auth_${mode}_step`);
    const savedEmail = sessionStorage.getItem(`auth_${mode}_email`);
    const sentAt = sessionStorage.getItem(`auth_${mode}_sentAt`);
    if (savedStep === "verify" && savedEmail) {
      setSubmittedEmail(savedEmail);
      setStep("verify");
    }

    if (sentAt) {
      const elapsedSeconds = Math.floor((Date.now() - Number(sentAt)) / 1000);
      const remaining = RESEND_SECONDS - elapsedSeconds;
      setResendIn(remaining > 0 ? remaining : 0);
    }
  }, [mode]);

  // RHF + Schema
  const schema = mode === "register" ? registerSchema : loginSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<AuthFormValues>,
    mode: "onChange",
  });

  // HANDLERS
  // Form submit handler
  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    setLoading(true);
    try {
      await onSubmitDetails(data);
      setSubmittedEmail(data.email);
      setStep("verify");
      setResendIn(RESEND_SECONDS);
      // session storage for percistant data
      sessionStorage.setItem(`auth_${mode}_email`, data.email);
      sessionStorage.setItem(`auth_${mode}_step`, "verify");
      sessionStorage.setItem(`auth_${mode}_sentAt`, Date.now().toString());
      setTimeout(() => otpRef.current?.focusFirst(), 50);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  });

  //   OTP verification
  const handleVerifySubmit = async (
    e: SubmitEvent<HTMLFormElement> | undefined,
    codeOverride?: string,
  ) => {
    e?.preventDefault();
    if (loading) return;

    const codeToVerify = codeOverride ?? code;

    const result = verificationCode.safeParse(codeToVerify);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onVerifyCode(codeToVerify);
      sessionStorage.removeItem(`auth_${mode}_email`);
      sessionStorage.removeItem(`auth_${mode}_step`);
      sessionStorage.removeItem(`auth_${mode}_sentAt`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Invalid or expired code",
      );
      setCode("");
      otpRef.current?.focusFirst();
      setLoading(false);
    }
  };

  //   Resend handler
  const handleResend = async () => {
    if (resendIn > 0) return;
    setError(null);
    try {
      await onResendCode();
      setResendIn(RESEND_SECONDS);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't resend code.",
      );
    }
  };

  //   OAuth click handler
  const handleOAuthClick = async (provider: "github" | "google") => {
    setError(null);
    try {
      await onOAuth(provider);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't connect, Try again.",
      );
    }
  };

  if (!hydrated) {
    return (
      <div className="w-full max-w-100 space-y-6 px-8 py-12 bg-card border rounded-2xl">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-100 space-y-6 px-8 py-12 bg-card border rounded-2xl">
      {step === "details" ? (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "register"
                ? "Start managing your freelance business."
                : "We'll email you a one-time code."}
            </p>
          </div>

          <div className="space-y-2">
            {mode === "register" ? (
              <>
                <Field
                  {...register("name")}
                  className="bg-input/20"
                  label="Full name"
                  placeholder="John Deo"
                  error={errors.name?.message}
                />
                <Field
                  {...register("email")}
                  className="bg-input/20"
                  label="Work Email"
                  placeholder="you@clentric.com"
                  error={errors.email?.message}
                />
              </>
            ) : (
              <Field
                {...register("email")}
                className="bg-input/20"
                label="Work Email"
                placeholder="you@clentric.com"
                error={errors.email?.message}
              />
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {/* Submit button */}
          <CustomButton
            type="submit"
            variant="primary"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading
              ? "..."
              : mode === "register"
                ? "Create account"
                : "Send code"}
          </CustomButton>

          {/* divider */}
          <div className="flex items-center justify-center gap-3 w-full">
            <span className="bg-border h-px w-1/4" />
            <span className="text-xs text-muted-foreground">
              or continue with
            </span>
            <span className="bg-border h-px w-1/4" />
          </div>

          {/* OAuth button */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <CustomButton
              type="button"
              variant="secondary"
              onClick={() => handleOAuthClick("google")}
            >
              <FcGoogle size={20} />
            </CustomButton>
            <CustomButton
              type="button"
              variant="secondary"
              onClick={() => handleOAuthClick("github")}
            >
              <FaGithub size={20} />
            </CustomButton>
          </div>

          <div className="space-x-1 text-[13px] flex items-center justify-center">
            <span>
              {mode === "register"
                ? "Already have an account?"
                : "Don't have an account?"}
            </span>
            <Link
              href={switchHref}
              className="text-primary font-bold underline"
            >
              {mode === "register" ? "Sign in" : "Create one"}
            </Link>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => handleVerifySubmit(e)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">
                {submittedEmail}
              </span>{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  sessionStorage.removeItem(`auth_${mode}_email`);
                  sessionStorage.removeItem(`auth_${mode}_step`);
                  sessionStorage.removeItem(`auth_${mode}_sentAt`);
                }}
                className="font-medium text-primary hover:underline"
              >
                Edit
              </button>
            </p>
          </div>

          <OtpInput
            ref={otpRef}
            length={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            onComplete={(value) => handleVerifySubmit(undefined, value)}
            error={error ?? undefined}
            disabled={loading}
          />

          <CustomButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying…" : "Verify code"}
          </CustomButton>

          <p className="text-[13px] text-center text-muted-foreground">
            {resendIn > 0 ? (
              <>Resend code in {resendIn}s</>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-primary hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </form>
      )}
    </div>
  );
}
