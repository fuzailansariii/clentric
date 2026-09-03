"use client";

import { Check } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";
import { Combobox } from "./combobox";

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
  return (
    <Combobox<ClientOption>
      items={clients}
      value={value}
      onChange={onChange}
      error={error}
      label="Client"
      placeholder="Select a client"
      emptyText="No client found."
      getId={(client) => client.id}
      getSearchValue={(client) => `${client.name} ${client.company ?? ""}`}
      renderSelected={(client) => (
        <span className="inline-flex max-w-full items-center gap-2 py-1 pr-3 pl-1">
          <AvatarInitials
            name={client.name}
            variant="colored"
            shape="circle"
            size="sm"
          />
          <span className="truncate text-sm font-medium">{client.name}</span>
        </span>
      )}
      renderItem={(client, isSelected) => (
        <>
          <AvatarInitials name={client.name} variant="colored" shape="circle" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate">{client.name}</span>
            {client.company && (
              <span className="text-muted-foreground truncate text-xs">
                {client.company}
              </span>
            )}
          </span>
          <Check
            className={cn(
              "ml-auto h-4 w-4 shrink-0",
              isSelected ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      )}
    />
  );
}
