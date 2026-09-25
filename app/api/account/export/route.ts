import { z } from "zod";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import { toCsv } from "@/lib/csv";
import { createZip } from "@/lib/zip";
import { getAccountExport, toJsonExport } from "./export-data";

// Reads the session cookie and the database on every request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formatSchema = z.enum(["json", "csv"]);

/**
 * GET /api/account/export?format=json|csv
 *
 * The signed-in user's own data, and only theirs: every query is scoped to
 * the id requireUser() returns, never to anything in the request.
 *   json — one file, one key per entity, children nested.
 *   csv  — one zip holding a CSV per table, linked by id columns.
 */
export async function GET(request: Request) {
  try {
    const format = formatSchema.safeParse(
      new URL(request.url).searchParams.get("format") ?? "json",
    );
    if (!format.success) {
      return new Response("Unknown format. Use json or csv.", { status: 400 });
    }

    const user = await requireUser();

    // Eight queries per export; a handful a minute is plenty for a person.
    if (
      isRateLimited(`account:export:${user.id}`, { max: 5, windowMs: 60_000 })
    ) {
      return new Response("Too many exports. Try again in a minute.", {
        status: 429,
      });
    }

    const data = await getAccountExport(user.id);
    const now = new Date();
    const filename = `clentric-export-${now.toISOString().slice(0, 10)}`;

    const headers = {
      // Per-user business data — never a shared or CDN cache.
      "Cache-Control": "private, no-store",
    };

    if (format.data === "json") {
      return new Response(JSON.stringify(toJsonExport(data, now), null, 2), {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    const zip = createZip(
      [
        {
          name: "clients.csv",
          content: toCsv(
            [
              "id",
              "name",
              "email",
              "phone",
              "company",
              "country",
              "status",
              "hourlyRate",
              "notes",
              "createdAt",
            ],
            data.clients,
          ),
        },
        {
          name: "projects.csv",
          content: toCsv(
            [
              "id",
              "clientId",
              "title",
              "description",
              "status",
              "budget",
              "currency",
              "hourlyRate",
              "deadline",
              "createdAt",
            ],
            data.projects,
          ),
        },
        {
          name: "project_milestones.csv",
          content: toCsv(
            ["id", "projectId", "title", "status", "dueDate", "sortOrder"],
            data.projectMilestones,
          ),
        },
        {
          name: "proposals.csv",
          content: toCsv(
            [
              "id",
              "clientId",
              "title",
              "content",
              "status",
              "currency",
              "subtotal",
              "taxRate",
              "tax",
              "total",
              "depositPercent",
              "expiresAt",
              "viewedAt",
              "acceptedAt",
              "rejectedAt",
              "declineReason",
              "createdAt",
            ],
            data.proposals,
          ),
        },
        {
          name: "proposal_milestones.csv",
          content: toCsv(
            ["id", "proposalId", "name", "description", "sortOrder"],
            data.proposalMilestones,
          ),
        },
        {
          name: "proposal_items.csv",
          content: toCsv(
            [
              "id",
              "proposalId",
              "milestoneId",
              "description",
              "quantity",
              "rate",
              "amount",
              "sortOrder",
            ],
            data.proposalItems,
          ),
        },
        {
          name: "invoices.csv",
          content: toCsv(
            [
              "id",
              "numberPrefix",
              "invoiceNumber",
              "clientId",
              "projectId",
              "status",
              "currency",
              "issueDate",
              "dueDate",
              "subTotal",
              "taxRate",
              "taxAmount",
              "total",
              "notes",
              "sentAt",
              "paidAt",
              "createdAt",
            ],
            data.invoices,
          ),
        },
        {
          name: "invoice_items.csv",
          content: toCsv(
            [
              "id",
              "invoiceId",
              "description",
              "quantity",
              "unit",
              "rate",
              "amount",
              "sortOrder",
            ],
            data.invoiceItems,
          ),
        },
      ],
      now,
    );

    return new Response(zip, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}.zip"`,
      },
    });
  } catch (error) {
    logError("GET /api/account/export", error);

    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      return new Response("Unauthorized.", { status: 401 });
    }

    if (
      error instanceof AppError &&
      error.code === "ACCOUNT_PENDING_DELETION"
    ) {
      return new Response("This account is scheduled for deletion.", {
        status: 403,
      });
    }

    // Never the raw error — it could carry a database message.
    return new Response("Something went wrong.", { status: 500 });
  }
}
