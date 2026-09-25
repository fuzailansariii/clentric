import React from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Eye, Plus } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import PreviewRow from "./preview-row";
import PreviewActions from "./preview-actions";

type InvoicePreviewProps = {
  /** Who the invoice is from: business name, else person, else email. */
  issuerName: string;
  clientName?: string;
  projectName?: string;
  dueDate?: string;
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  /** Save: creates a draft (new invoice) or saves changes (editing). */
  onSubmit: () => void;
  /** Create & Send: creates the invoice, then marks it sent. */
  onSubmitAndSend?: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  /** Set when editing an existing invoice: shows its real number and a
   * single "Save changes" action instead of the create actions. */
  editing?: { invoiceNumber: string };
};

export default function InvoicePreview({
  issuerName,
  clientName,
  projectName,
  dueDate,
  subTotal,
  taxRate,
  taxAmount,
  total,
  onSubmit,
  onSubmitAndSend,
  onCancel,
  isSubmitting,
  editing,
}: InvoicePreviewProps) {
  return (
    <div className="w-full min-w-0">
      <div className="border-border items-center rounded-lg border">
        <h2 className="mb flex w-full items-center gap-3 border-b p-4">
          <Eye className="h-4 w-4" />
          <span className="font-space text-sm font-medium">Live Preview</span>
        </h2>
        <div className="flex flex-col p-4">
          <h2 className="flex items-center gap-3 border-b pb-4 text-[15px] font-medium">
            {/* TODO(logo-upload): show the business logo here once
                uploads exist; initials are the fallback. */}
            <AvatarInitials
              name={issuerName}
              shape="square"
              size="md"
              variant="neutral"
              className="font-space rounded-lg font-medium"
            />
            <span className="min-w-0 truncate">{issuerName}</span>
          </h2>

          <PreviewRow
            label="Invoice #"
            value={
              editing?.invoiceNumber ?? "Assigned automatically when you save"
            }
          />
          <PreviewRow label="Client" value={clientName ?? "Select a client"} />
          <PreviewRow label="Project" value={projectName ?? "No project"} />
          <PreviewRow label="Due Date" value={dueDate ?? "—"} />
          <PreviewRow
            label="Subtotal"
            value={formatCurrency(String(subTotal))}
          />
          <PreviewRow
            label={`Tax (${formatNumber(taxRate)}%)`}
            value={formatCurrency(String(taxAmount))}
          />
          <PreviewRow
            label="Total"
            value={formatCurrency(String(total))}
            emphasize
          />

          {!editing && (
            <div className="mt-4">
              <span className="bg-muted-foreground/20 font-space rounded px-2.5 py-1 text-xs font-bold">
                draft
              </span>
            </div>
          )}
        </div>
      </div>

      <PreviewActions
        actions={
          editing
            ? [
                {
                  label: isSubmitting ? "Saving..." : "Save changes",
                  variant: "primary",
                  onClick: onSubmit,
                  disabled: isSubmitting,
                },
                {
                  label: "Cancel",
                  variant: "ghost",
                  onClick: onCancel,
                },
              ]
            : [
                {
                  label: "Create & Send",
                  variant: "primary",
                  onClick: onSubmitAndSend ?? onSubmit,
                  disabled: isSubmitting,
                  icon: <Plus className="h-4 w-4" />,
                },
                {
                  label: "Save as Draft",
                  variant: "secondary",
                  onClick: onSubmit,
                  disabled: isSubmitting,
                },
                {
                  label: "Cancel",
                  variant: "ghost",
                  onClick: onCancel,
                },
              ]
        }
      />
    </div>
  );
}
