"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

export type ClientOption = {
  id: string;
  name: string;
  company: string | null;
};

type ClientComboboxProps = {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
  error?: string;
};

export function ClientCombobox({
  clients,
  value,
  onChange,
  error,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-muted-foreground font-sans text-[13px] font-medium">
        Client
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            className={cn(
              "border-border bg-input/20 flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium",
              "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2 focus-visible:outline-none",
              !selected && "text-muted-foreground",
            )}
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <AvatarInitials
                  name={selected.name}
                  variant="colored"
                  shape="circle"
                />
                <span className="truncate">
                  {selected.name}
                  {selected.company ? ` — ${selected.company}` : ""}
                </span>
              </span>
            ) : (
              "Select a client"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.company ?? ""}`}
                    onSelect={() => {
                      onChange(client.id);
                      setOpen(false);
                    }}
                  >
                    <AvatarInitials
                      name={client.name}
                      variant="colored"
                      shape="circle"
                    />
                    <span className="ml-2 truncate">
                      {client.name}
                      {client.company ? ` — ${client.company}` : ""}
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        client.id === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <span className="text-danger-600 text-xs">{error}</span>}
    </div>
  );
}
