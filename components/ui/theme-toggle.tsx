"use client";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The resolved theme is only known in the browser, so the first paint has to
  // match the server's. useHydrated keeps that check out of an effect.
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
