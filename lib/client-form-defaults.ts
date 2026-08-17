import type { ClientInput } from "@/app/(dashboard)/clients/schema";
import type { ClientRow } from "@/src/db/schema/clients";

export function toClientFormsDefault(client: ClientRow): ClientInput {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    country: client.country ?? "",
    notes: client.notes ?? "",
    status: client.status,
  };
}
