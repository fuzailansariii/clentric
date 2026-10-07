"use client";

import { useRef } from "react";

/**
 * Returns focus to whatever opened a dialog, once it closes.
 *
 * Radix Dialog only restores focus to its own <DialogTrigger>. A dialog
 * opened from state (a row's Edit button, a switch, a menu item) has no
 * trigger, so on close focus falls back to <body> and keyboard users lose
 * their place. Spread the result onto <DialogContent>:
 *
 *   <DialogContent {...useReturnFocus()}>
 *
 * onOpenAutoFocus runs before focus moves into the dialog, so
 * document.activeElement is still the opener at that moment.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    },
    onCloseAutoFocus: (event: Event) => {
      const target = opener.current;
      opener.current = null;
      // Skip when the opener has gone (e.g. the row re-rendered away).
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
