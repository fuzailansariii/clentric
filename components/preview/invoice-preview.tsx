import React from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Eye, Plus } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import PreviewRow from "./preview-row";
import PreviewActions from "./preview-actions";

type InvoicePreviewProps = {
  clientName?: string;
  projectName?: string;
  dueDate?: string;
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

export default function InvoicePreview({
  clientName,
  projectName,
  dueDate,
  subTotal,
  taxRate,
  taxAmount,
  total,
  onSubmit,
  onCancel,
  isSubmitting,
}: InvoicePreviewProps) {
  return (
    <div className="max-w-sm">
      <div className="border-border items-center rounded-lg border">
        <h2 className="mb flex w-full items-center gap-3 border-b p-4">
          <Eye className="h-4 w-4" />
          <span className="font-space text-sm font-medium">Live Preview</span>
        </h2>
        <div className="flex flex-col p-4">
          <h2 className="flex items-center gap-3 border-b pb-4 text-[15px] font-medium">
            <AvatarInitials
              name="Clentric"
              shape="square"
              size="md"
              variant="neutral"
              className="font-space rounded-lg font-medium"
            />
            <span>Clentric Studio</span>
          </h2>

          <PreviewRow
            label="Invoice #"
            value="Assigned automatically when you save"
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

          <div className="mt-4">
            <span className="bg-muted-foreground/20 font-space rounded px-2.5 py-1 text-xs font-bold">
              draft
            </span>
          </div>
        </div>
      </div>

      <PreviewActions
        actions={[
          {
            label: "Create & Send",
            variant: "primary",
            onClick: onSubmit, // TODO: once sendInvoiceAction exists, this should
            // chain createInvoiceAction -> sendInvoiceAction,
            // not call the same create-only handler as Draft
            disabled: isSubmitting,
            icon: <Plus className="h-4 w-4" />,
          },
          {
            label: "Save as Draft",
            variant: "secondary",
            onClick: onSubmit, // TODO: same as above — identical to Create & Send
            // for now since there's no send step to skip yet
            disabled: isSubmitting,
          },
          {
            label: "Cancel",
            variant: "ghost",
            onClick: onCancel,
          },
        ]}
      />
    </div>
  );
}
