import { redirect } from "next/navigation";
import { DEFAULT_SETTINGS_TAB } from "./sections";

/** /settings opens the first tab. */
export default function SettingsPage() {
  redirect(`/settings/${DEFAULT_SETTINGS_TAB.slug}`);
}
