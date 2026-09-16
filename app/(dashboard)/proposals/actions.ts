"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { ActionResult } from "@/lib/action-result";
import { logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import { db } from "@/src/db";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { proposals } from "@/src/db/schema/proposals";

export type PublicProposal = {
  id: string;
  title: string;
  content: string | null;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  status: "sent" | "viewed" | "accepted" | "rejected";
  expiresAt: Date | null;
  createdAt: Date;
  clientName: string;
  clientCompany: string | null;
  items: {
    id: string;
    description: string;
    quantity: string;
    rate: string;
    amount: string;
  }[];
};

const viewableStatuses = ["sent", "viewed", "accepted", "rejected"] as const;

function isViewable(
  status: (typeof proposals.$inferSelect)["status"],
): status is (typeof viewableStatuses)[number] {
  return (viewableStatuses as readonly string[]).includes(status);
}

export async function getProposalByToken(
  token: string,
): Promise<ActionResult<PublicProposal>> {
  if (isRateLimited(`proposal:read:${token}`, { max: 30, windowMs: 60_000 })) {
    return {
      success: false as const,
      error: "Too many requests. Try again shortly.",
    };
  }

  if (!token || token.length < 20) {
    return { success: false as const, error: "Invalid link" };
  }

  try {
    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.token, token), isNull(proposals.deletedAt)),
      columns: {
        id: true,
        title: true,
        content: true,
        currency: true,
        subtotal: true,
        tax: true,
        total: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      with: {
        client: { columns: { name: true, company: true } },
        items: {
          columns: {
            id: true,
            description: true,
            quantity: true,
            rate: true,
            amount: true,
          },
          orderBy: [asc(proposalItems.sortOrder), asc(proposalItems.id)],
        },
      },
    });

    // One message for "gone", "never shared", and "revoked" — a public endpoint
    // shouldn't let a guesser tell those apart.
    if (
      !proposal ||
      !isViewable(proposal.status) ||
      (proposal.expiresAt && proposal.expiresAt.getTime() <= Date.now())
    ) {
      return {
        success: false as const,
        error: "This proposal is no longer available.",
      };
    }

    const { client, ...rest } = proposal;

    return {
      success: true as const,
      data: {
        ...rest,
        status: proposal.status,
        clientName: client.name,
        clientCompany: client.company,
      },
    };
  } catch (error) {
    logError("getProposalByToken", error);
    return {
      success: false as const,
      error: "Could not load this proposal.",
    };
  }
}
