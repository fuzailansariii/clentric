"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  verificationCode,
  loginSchema,
  registerSchema,
} from "@/lib/validations/auth";
import z from "zod";
import { useEffect, useRef, useState } from "react";
import { Field } from "./ui/input";
import { CustomButton } from "./ui/custom-button";
import Link from "next/link";

type AuthFormProps = {
  mode: "login" | "register";
  onSubmitDetails: (data: { name?: string; email: string }) => Promise<void>;
  onVerifyCode: (code: string) => Promise<void>;
  onResendCode: () => Promise<void>;
  onOAuth: (provider: "google" | "github") => void;
  switchHref: string;
};

const RESEND_SECONDS = 30;

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
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend code
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // RHF + Schema
  const schema = mode === "login" ? loginSchema : registerSchema;
  const {
    register,
    handleSubmit,
    formState: { isValid, errors },
    getValues,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  // Handlers
  const onSubmit = async () => {};
  const handleVerifySubmit = async () => {};

  return (
    <div className="w-full max-w-100 space-y-6 px-8 py-12 bg-card border rounded-2xl">
      {step === "details" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold font-space tracking-tight">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              {mode === "register"
                ? "Start managing your freelance business."
                : "We'll email you a one-time code."}
            </p>
          </div>
          <div className="space-y-2">
            {mode === "register" ? (
              <>
                <Field
                  className="bg-input/20"
                  label="Full name"
                  placeholder="John Deo"
                />
                <Field
                  className="bg-input/20"
                  label="Work Email"
                  placeholder="johndeo@example.com"
                />
              </>
            ) : (
              <Field
                className="bg-input/20"
                label="Work Email"
                placeholder="example@clentric.com"
              />
            )}
          </div>
          {/* Submit button */}
          <CustomButton
            variant="primary"
            className="w-full mt-2"
            disabled={true}
          >
            {mode === "register" ? "Create accound" : "Login"}
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
            <CustomButton variant="secondary">Google</CustomButton>
            <CustomButton variant="secondary">GitHub</CustomButton>
          </div>

          {/* Redirect link */}
          <div className="text-center font-sans text-xs sm:text-sm text-muted-foreground">
            {mode === "register" ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  Log in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  Create one
                </Link>
              </>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit}>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{"fuzail"}</span>{" "}
              <button
                type="button"
                onClick={() => setStep("details")}
                className="font-medium text-primary hover:underline"
              >
                Edit
              </button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
