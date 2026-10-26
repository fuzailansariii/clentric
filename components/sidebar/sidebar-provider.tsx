"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

type SidebarContextValue = {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isMobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
};

const sidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      document.cookie = `sidebar_collapsed=${next}; path=/; max-age=31536000`;
      return next;
    });
  }, []);

  const openMobile = useCallback(() => {
    setIsMobileOpen(true);
  }, []);
  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <sidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapsed,
        isMobileOpen,
        openMobile,
        closeMobile,
      }}
    >
      {children}
    </sidebarContext.Provider>
  );
}

// Inside the mobile drawer, sidebar parts ignore the desktop collapsed state.
const inDrawerContext = createContext(false);

export function InDrawer({ children }: { children: ReactNode }) {
  return (
    <inDrawerContext.Provider value={true}>{children}</inDrawerContext.Provider>
  );
}

export function useInDrawer() {
  return useContext(inDrawerContext);
}

export function useSidebar() {
  const ctx = useContext(sidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
