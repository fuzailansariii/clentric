import { CustomButton } from "./ui/custom-button";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again, or come back later.",
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-2xl font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <CustomButton
          onClick={onRetry}
          variant="ghost"
          className="mt-2 text-sm underline"
        >
          {retryLabel}
        </CustomButton>
      )}
    </div>
  );
}
