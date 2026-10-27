"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function filenameFrom(disposition: string | null) {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "invoice.pdf";
}

/**
 * Fetches a PDF and saves it, instead of a plain download link, so the
 * button can show it's working and a failed render shows a toast.
 */
export function usePdfDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const busy = useRef(false);

  const download = useCallback(async (href: string) => {
    if (busy.current) return;
    busy.current = true;
    setIsDownloading(true);
    const toastId = toast.loading("Preparing PDF...");
    try {
      const response = await fetch(href);
      if (!response.ok) {
        // The PDF route only ever answers with short, user-safe text.
        const message = (await response.text()).trim();
        toast.error(message || "Couldn't download the PDF.", { id: toastId });
        return;
      }
      const filename = filenameFrom(
        response.headers.get("Content-Disposition"),
      );
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`${filename} downloaded`, { id: toastId });
    } catch {
      toast.error("Couldn't download the PDF. Check your connection.", {
        id: toastId,
      });
    } finally {
      busy.current = false;
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}
