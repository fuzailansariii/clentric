import { notFound } from "next/navigation";
import { getClientById } from "../queries";
import { clientIdSchema } from "../schema";
import { ClientDetail } from "./client-details";
import {
  countProjectsByClientId,
  getAllProjects,
} from "../../projects/queries";
import {
  countInvoicesByClientId,
  getInvoicesByUserId,
} from "../../invoices/queries";

type ClientPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientPage({
  params,
  searchParams,
}: ClientPageProps) {
  const { id } = await params;
  const query = await searchParams;

  // A malformed id can't be a client — 404 rather than a validation error.
  if (!clientIdSchema.safeParse(id).success) {
    notFound();
  }

  const section = query.section === "invoices" ? "invoices" : "projects";
  const isSearching =
    typeof query.search === "string" && query.search.trim() !== "";

  // Only the open tab's list is fetched — paged, searched and filtered in
  // the database. The other tab only needs its badge count. The open tab's
  // badge reuses its list's unfiltered count, unless a search narrowed it.
  const [client, projectList, invoiceList, projectCount, invoiceCount] =
    await Promise.all([
      getClientById(id),
      section === "projects" ? getAllProjects(query, { clientId: id }) : null,
      section === "invoices"
        ? getInvoicesByUserId(query, { clientId: id })
        : null,
      section === "projects" && !isSearching
        ? null
        : countProjectsByClientId(id),
      section === "invoices" && !isSearching
        ? null
        : countInvoicesByClientId(id),
    ]);

  if (!client) notFound();

  return (
    <ClientDetail
      client={client}
      section={section}
      projects={projectList}
      invoices={invoiceList}
      projectCount={projectCount ?? projectList?.allCount ?? 0}
      invoiceCount={invoiceCount ?? invoiceList?.allCount ?? 0}
      initialEdit={query.edit === "true"}
    />
  );
}
