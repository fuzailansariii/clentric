"use client";
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { countryOptions } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CustomButton } from "./custom-button";
import { Check, ChevronsDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { cn } from "@/lib/utils";

type PhoneFieldProps = {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  defaultCountryValue?: string; // ISO2, e.g. "US"
  syncCountryValue?: string; // ISO2 from the separate Country field
  onDialCountryChange?: (isoValue: string) => void; // notifies parent when user manually picks a dial code
};

export type PhoneFieldHandle = {
  resetOverride: () => void;
};

export const PhoneField = forwardRef<PhoneFieldHandle, PhoneFieldProps>(
  function PhoneField(
    {
      value,
      onChange,
      label = "Phone",
      error,
      defaultCountryValue = "US",
      syncCountryValue,
      onDialCountryChange,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [dialCountry, setDialCountry] = useState(
      () =>
        countryOptions.find((c) => c.value === defaultCountryValue) ??
        countryOptions[0],
    );
    const listRef = useRef<HTMLDivElement>(null);
    const userOverrodeRef = useRef(false);

    useImperativeHandle(ref, () => ({
      resetOverride: () => {
        userOverrodeRef.current = false;
      },
    }));

    const localNumber = value?.startsWith(dialCountry.callingCode)
      ? value.slice(dialCountry.callingCode.length).trim()
      : (value ?? "");

    const emitChange = (country: typeof dialCountry, number: string) => {
      const trimmed = number.trim();
      onChange(trimmed ? `${country.callingCode} ${trimmed}` : "");
    };

    // Country field -> Phone (only while not overridden by a manual phone pick)
    useEffect(() => {
      if (!syncCountryValue || userOverrodeRef.current) return;
      const matched = countryOptions.find((c) => c.value === syncCountryValue);
      if (matched && matched.value !== dialCountry.value) {
        setDialCountry(matched);
        emitChange(matched, localNumber);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncCountryValue]);

    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label className="text-muted-foreground font-sans text-[13px] font-medium">
            {label}
          </label>
        )}
        <div
          className={cn(
            "border-border bg-input/20 focus-within:border-ring focus-within:ring-ring/20 flex h-10 items-center rounded-lg border focus-within:ring-2",
            error && "border-danger-600",
          )}
        >
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={open}
                className="flex h-full shrink-0 items-center gap-1 px-3 text-sm font-medium focus-visible:outline-none"
              >
                <span className="text-sm leading-none">{dialCountry.code}</span>
                <span>{dialCountry.callingCode}</span>
                <ChevronsDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandInput
                  placeholder="Search country..."
                  onValueChange={() => {
                    requestAnimationFrame(() => {
                      const viewport =
                        listRef.current?.querySelector(
                          "[cmdk-list-sizer]",
                        )?.parentElement;
                      viewport?.scrollTo({ top: 0 });
                    });
                  }}
                />
                <CommandList ref={listRef}>
                  <CommandEmpty>No Country Found.</CommandEmpty>
                  <CommandGroup>
                    {countryOptions.map((country) => (
                      <CommandItem
                        key={country.value}
                        value={`${country.label} ${country.callingCode}`}
                        onSelect={() => {
                          userOverrodeRef.current = true;
                          setDialCountry(country);
                          emitChange(country, localNumber);
                          onDialCountryChange?.(country.value);
                          setOpen(false);
                        }}
                      >
                        <span className="text-muted-foreground w-12 shrink-0 text-left text-xs tabular-nums">
                          {country.callingCode}
                        </span>
                        <span className="flex-1">{country.label}</span>
                        <Check
                          className={cn(
                            "ml-2",
                            dialCountry.value === country.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="bg-border h-5 w-px shrink-0" />

          <input
            type="tel"
            inputMode="tel"
            value={localNumber}
            onChange={(e) => emitChange(dialCountry, e.target.value)}
            placeholder="9123456789"
            aria-invalid={!!error}
            className="text-foreground placeholder:text-muted-foreground h-full w-full border-none bg-transparent px-3 font-sans text-sm font-medium focus-visible:outline-none"
          />
        </div>
        {error && <span className="text-danger-600 text-xs">{error}</span>}
      </div>
    );
  },
);
