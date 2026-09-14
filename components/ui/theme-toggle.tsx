"use client";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser — render a same-size placeholder
  // until then so the icon doesn't flip after hydration.
  const hydrated = useHydrated();

  if (!hydrated) {
    return <button className="w-9 h-9" />; // placeholder, same size, no icon yet
  }

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
