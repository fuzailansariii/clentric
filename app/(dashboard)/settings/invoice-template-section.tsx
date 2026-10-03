import { notFound } from "next/navigation";
import { SettingsCard } from "@/components/settings/settings-card";
import { getInvoiceTemplateSetting } from "./queries";
import { InvoiceTemplatePicker } from "./invoice-template-picker";

export async function InvoiceTemplateSection() {
  const template = await getInvoiceTemplateSetting();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!template) {
    notFound();
  }

  return (
    <SettingsCard>
      <InvoiceTemplatePicker template={template} />
    </SettingsCard>
  );
}
