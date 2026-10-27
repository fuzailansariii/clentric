import { notFound } from "next/navigation";
import { getInvoiceById, getInvoiceReminderDates } from "../../queries";
import { getClientById } from "../../../clients/queries";
import {
  getClientProjectOptions,
  getInvoicesForProject,
  getMilestonesByProjectId,
  getProjectById,
} from "../../../projects/queries";
import { getEmailStatus } from "@/lib/email/quota";
import { boardProject } from "@/lib/project-progress";
import { sumProjectInvoices } from "@/lib/project-ledger";
import { InvoiceDetail } from "../invoice-detail";

type InvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;

  // null means the invoice doesn't exist (or isn't yours). A failed query
  // throws instead, so it reaches the error page rather than a 404.
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const projectId = invoice.projectId;
  const [
    client,
    project,
    milestones,
    projectInvoices,
    emailStatus,
    reminders,
    clientProjects,
  ] = await Promise.all([
    getClientById(invoice.clientId),
    projectId ? getProjectById(projectId) : null,
    projectId ? getMilestonesByProjectId(projectId) : [],
    projectId ? getInvoicesForProject(projectId) : [],
    getEmailStatus(invoice.id, "invoice"),
    getInvoiceReminderDates(invoice.id),
    projectId ? [] : getClientProjectOptions(invoice.clientId),
  ]);

  // The project card shows the same status and stage bar as the board.
  const board = project
    ? boardProject({
        status: project.status,
        pricing: project.pricing,
        billing: project.billing,
        budget: Number(project.budget),
        billed: sumProjectInvoices(projectInvoices).billed,
        daysUntilDeadline: project.daysUntilDeadline,
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          done: m.status === "completed",
          dueDate: m.dueDate,
          daysUntilDue: m.daysUntilDue,
          amount: m.amount === null ? null : Number(m.amount),
          invoiced: m.invoice !== null,
        })),
      })
    : null;

  return (
    <InvoiceDetail
      invoice={invoice}
      client={client}
      project={project && board ? { ...project, board } : null}
      clientProjects={clientProjects}
      emailStatus={emailStatus}
      reminders={reminders}
    />
  );
}
