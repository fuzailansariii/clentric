import React from "react";

type FormSectionProps = {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function FormSection({
  children,
  description,
  step,
  title,
}: FormSectionProps) {
  return (
    <section className="p-6 sm:p-8">
      <div className="mb-7">
        <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.15rem] uppercase">
          {step}
        </p>

        <h2 className="mt-2 text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}
