import { runActionWithToast } from "@/lib/run-action-with-toast";
import { updateClientAction } from "./actions";

/** Archive hides a client from the lists; restore brings them back. Work stays. */
export function setClientArchived(
  client: { id: string; name: string },
  archive: boolean,
) {
  return runActionWithToast(
    updateClientAction(client.id, { status: archive ? "archived" : "active" }),
    {
      loading: archive ? "Archiving client..." : "Restoring client...",
      success: archive ? `${client.name} archived` : `${client.name} restored`,
    },
  );
}
