import { notFound } from "next/navigation";
import { getClientById } from "../../queries";
import { clientIdSchema } from "../../schema";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!clientIdSchema.safeParse(id).success) notFound();

  const client = await getClientById(id);
  if (!client) notFound();

  return <ClientForm client={client} />;
}
