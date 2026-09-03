"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// T = "whatever item type this combobox instance is showing" — a client, a
// project, anything with a stable string id. The component itself never
// needs to know what T actually is; the caller supplies small functions
// that know how to work with it.
type ComboboxProps<T> = {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  getId: (item: T) => string;
  // The string CommandInput's search box matches against — NOT what's shown,
  // just what's searched. e.g. "Jane Doe Acme Inc" so typing "acme" finds Jane.
  getSearchValue: (item: T) => string;
  // What the trigger button shows once something is selected.
  renderSelected: (item: T) => React.ReactNode;
  // What each row in the open dropdown looks like. `isSelected` lets you
  // show a checkmark or highlight on the currently chosen item.
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  label: string;
  placeholder: string;
  emptyText: string;
  error?: string;
  disabled?: boolean;
};

export function Combobox<T>({
  items,
  value,
  onChange,
  getId,
  getSearchValue,
  renderSelected,
  renderItem,
  label,
  placeholder,
  emptyText,
  error,
  disabled,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => getId(item) === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-muted-foreground font-sans text-[13px] font-medium">
        {label}
      </label>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            disabled={disabled}
            className={cn(
              "border-border bg-input/20 flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3.5 text-sm",
              "transition-colors duration-150",
              "hover:border-ring/40 hover:bg-input/40",
              "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2 focus-visible:outline-none",
              "disabled:hover:bg-input/20 disabled:hover:border-border disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger-400",
            )}
          >
            {selected ? (
              <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                {renderSelected(selected)}
              </span>
            ) : (
              <span className="text-muted-foreground flex-1 truncate text-left">
                {placeholder}
              </span>
            )}
            <ChevronsUpDown
              className={cn(
                "text-muted-foreground/70 h-4 w-4 shrink-0 transition-transform duration-150",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="border-border w-[--radix-popover-trigger-width] overflow-hidden rounded-lg border p-0 shadow-lg"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search..." className="h-10 text-sm" />
            <CommandList>
              <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                {emptyText}
              </CommandEmpty>
              <CommandGroup>
                {items.map((item) => {
                  const id = getId(item);
                  const isSelected = id === value;
                  return (
                    <CommandItem
                      key={id}
                      value={getSearchValue(item)}
                      onSelect={() => {
                        onChange(id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm"
                    >
                      {renderItem(item, isSelected)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <span className="text-danger-600 text-xs">{error}</span>}
    </div>
  );
}
