"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import type { ActionResult } from "@/lib/action-result";

type UndoableActionMessages = {
  /** Shown immediately, alongside the Undo button, for the grace window. */
  queued: string;
  loading: string;
  success: string;
};

/**
 * Runs `action` after a short grace window instead of immediately — the
 * "Gmail undo send" pattern. A toast with an Undo button appears right
 * away; the action only actually fires once that window elapses unvisited.
 * Use this for anything that's one-way once it fires (e.g. an email), where
 * a mis-click shouldn't be irreversible.
 */
export function useUndoableAction(
  action: () => Promise<ActionResult>,
  messages: UndoableActionMessages,
  delayMs: number,
  options: {
    /** Runs after the action succeeds — typically router.refresh(), so the
     * page picks up what the action changed (e.g. a reminder cooldown). */
    onSuccess?: () => void;
  } = {},
) {
  const [isQueued, setIsQueued] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setIsQueued(true);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsQueued(false);
      void runActionWithToast(action(), {
        loading: messages.loading,
        success: messages.success,
        onSuccess: options.onSuccess,
      });
    }, delayMs);

    toast(messages.queued, {
      duration: delayMs,
      action: {
        label: "Undo",
        onClick: () => {
          if (timeoutRef.current === null) return; // already fired
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          setIsQueued(false);
          toast.success("Cancelled — nothing was sent.");
        },
      },
    });
  }, [action, messages, delayMs, options.onSuccess]);

  return { trigger, isQueued };
}
