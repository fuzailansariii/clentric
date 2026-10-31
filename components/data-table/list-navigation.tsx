"use client";

import {
  createContext,
  useContext,
  useOptimistic,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type ListNavigation = {
  /** The URL query, already showing the last click while its page loads. */
  query: URLSearchParams;
  isPending: boolean;
  /** Opens this page with a new query: replaces history unless `push`. */
  navigate: (query: URLSearchParams, options?: { push?: boolean }) => void;
};

const ListNavigationContext = createContext<ListNavigation | null>(null);

/**
 * Tabs, filter chips and pages change the URL, and the server renders the new
 * list. This makes the click show at once and marks the list as loading.
 */
export function ListNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = `${pathname}?${searchParams.toString()}`;
  const [shown, setShown] = useOptimistic(current);

  const navigate: ListNavigation["navigate"] = (query, options) => {
    const href = `${pathname}?${query.toString()}`;
    startTransition(() => {
      setShown(href);
      if (options?.push) router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    });
  };

  // A click on another page (sidebar link) must not show this page's query.
  const split = shown.indexOf("?");
  const query = new URLSearchParams(
    shown.slice(0, split) === pathname
      ? shown.slice(split + 1)
      : searchParams.toString(),
  );

  return (
    <ListNavigationContext.Provider value={{ query, isPending, navigate }}>
      {children}
    </ListNavigationContext.Provider>
  );
}

export function useListNavigation() {
  const value = useContext(ListNavigationContext);
  if (!value) {
    throw new Error("useListNavigation needs a ListNavigationProvider.");
  }
  return value;
}

/** Dims a list while its next page loads; a short delay hides fast loads. */
export function ListPendingFade({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { isPending } = useListNavigation();
  return (
    <div
      aria-busy={isPending || undefined}
      style={style}
      className={cn(
        "transition-opacity duration-200",
        isPending && "opacity-55 delay-150",
        className,
      )}
    >
      {children}
    </div>
  );
}
