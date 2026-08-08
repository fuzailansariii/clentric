import { countryOptions } from "@/lib/countries";
import { useState, useRef } from "react";
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

type CountryComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
};

export function CountryCombobox({
  value,
  onChange,
  label = "Country",
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = countryOptions.find((c) => c.value === value);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <label className="text-muted-foreground font-sans text-[13px] font-medium">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CustomButton
            type="button"
            variant="secondary"
            role="combobox"
            aria-expanded={open}
            className="flex w-full items-center justify-between font-normal"
          >
            {selected ? selected.label : "Select country..."}
            <ChevronsDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </CustomButton>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                    value={country.label}
                    onSelect={() => {
                      onChange(country.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1">{country.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {country.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
