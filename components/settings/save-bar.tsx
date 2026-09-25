import { Loader2 } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";

type SaveBarProps = {
  /** Show the "Unsaved changes" label (e.g. react-hook-form's isDirty). */
  isDirty?: boolean;
  isPending?: boolean;
  /** Disable Save without a pending state, e.g. nothing has changed yet. */
  disabled?: boolean;
  label?: string;
  /**
   * Leave unset inside a <form> so the button submits it. Pass a handler for
   * a bar that isn't in a form; the button then becomes type="button".
   */
  onSave?: () => void;
};

/** Bottom-of-card bar for a <SettingsSection footer={...} />. */
export function SaveBar({
  isDirty = false,
  isPending = false,
  disabled = false,
  label = "Save",
  onSave,
}: SaveBarProps) {
  return (
    <div className="bg-secondary/40 flex items-center justify-end gap-3 border-t px-5 py-3 sm:px-6">
      {/* Always mounted so screen readers announce the text when it appears. */}
      <span role="status" className="text-muted-foreground mr-auto text-sm">
        {isDirty && !isPending ? "Unsaved changes" : null}
      </span>
      <CustomButton
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        size="sm"
        disabled={disabled || isPending}
        aria-busy={isPending || undefined}
      >
        {isPending && (
          <Loader2 aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" />
        )}
        {isPending ? "Saving..." : label}
      </CustomButton>
    </div>
  );
}
