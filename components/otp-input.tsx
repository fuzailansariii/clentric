import { cn } from "@/lib/utils";
import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type OTPInputProps = {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
};

export type OtpInputHandle = {
  focusFirst: () => void;
};

export const OtpInput = forwardRef<OtpInputHandle, OTPInputProps>(
  (
    {
      onComplete,
      autoFocus = true,
      className = "",
      disabled,
      error,
      length = 6,
      onChange,
      value: controlledValue,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      controlledValue ?? "",
    );
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const maxReachableIndexRef = useRef(0);

    const value = controlledValue ?? internalValue;
    const digits = Array.from({ length }, (_, i) => value[i] ?? "");

    const getFirstEmptyIndex = (str: string) => {
      for (let i = 0; i < length; i++) {
        if (!str[i]) return i;
      }
      return length - 1;
    };

    const emitChange = useCallback(
      (next: string) => {
        maxReachableIndexRef.current = getFirstEmptyIndex(next);
        setInternalValue(next);
        onChange?.(next);
        if (next.length === length) {
          onComplete?.(next);
        }
      },
      [onChange, onComplete, length],
    );

    const focusInput = (index: number) => {
      inputsRef.current[index]?.focus();
      inputsRef.current[index]?.select();
    };

    useImperativeHandle(ref, () => ({
      focusFirst: () => focusInput(0),
    }));

    const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const raw = e.target.value;

      const digit = raw.replace(/[^0-9]/g, "").slice(-1);
      const nextDigits = [...digits];
      nextDigits[index] = digit;
      const next = nextDigits.join("").slice(0, length);
      emitChange(next);

      if (digit && index < length - 1) {
        focusInput(index + 1);
      }
    };

    const handleKeyDown = (
      e: KeyboardEvent<HTMLInputElement>,
      index: number,
    ) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index]) {
          const truncated = digits.slice(0, index);
          emitChange(truncated.join(""));
          focusInput(index);
        } else if (index > 0) {
          const truncated = digits.slice(0, index - 1);
          emitChange(truncated.join(""));
          focusInput(index - 1);
        }
        return;
      }

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      }

      if (e.key === "ArrowRight" && index < maxReachableIndexRef.current) {
        e.preventDefault();
        focusInput(index + 1);
      }

      if (e.key === "Delete") {
        e.preventDefault();
        const truncated = digits.slice(0, index);
        emitChange(truncated.join(""));
      }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[^0-9]/g, "")
        .slice(0, length);

      if (!pasted) return;

      emitChange(pasted);

      const nextFocusIndex = Math.min(pasted.length, length - 1);
      focusInput(nextFocusIndex);
    };

    const handleFocus = (
      e: React.FocusEvent<HTMLInputElement>,
      index: number,
    ) => {
      if (index > maxReachableIndexRef.current) {
        focusInput(maxReachableIndexRef.current);
        return;
      }
      e.target.select();
    };

    return (
      <div className="flex flex-col gap-1.5">
        <div
          role="group"
          aria-label="One-time passcode"
          className={cn("flex gap-2", className)}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              autoFocus={autoFocus && index === 0}
              aria-label={`Digit ${index + 1} of ${length}`}
              aria-invalid={!!error}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onFocus={(e) => handleFocus(e, index)}
              onMouseDown={(e) => {
                if (index > maxReachableIndexRef.current) {
                  e.preventDefault();
                  focusInput(maxReachableIndexRef.current);
                }
              }}
              className={cn(
                "h-12 w-11 rounded-lg border border-border bg-input/20 text-center font-sans text-lg font-medium text-foreground",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                error && "border-destructive focus-visible:ring-destructive/30",
              )}
            />
          ))}
        </div>
        {error && <span className="text-xs text-danger-600">{error}</span>}
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";
