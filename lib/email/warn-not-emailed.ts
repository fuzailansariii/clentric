import { toast } from "sonner";

/** After a send that worked but whose email didn't go out. */
export function warnNotEmailed(
  emailError: string | null,
  what: "invoice" | "proposal",
) {
  if (!emailError) return;
  toast.warning(`The ${what} wasn't emailed`, {
    description: `${emailError} ${
      what === "invoice"
        ? "You can download the PDF and send it yourself."
        : "You can copy the client link and send it yourself."
    }`,
    duration: 10_000,
  });
}
