/**
 * Single source of truth for the settings area: the tab bar, the header
 * breadcrumbs and the [section] route all read from this list, so adding a
 * tab means adding one entry here.
 */

export const SETTINGS_TABS = [
  {
    slug: "account",
    label: "Account",
    description: "Your profile and your data.",
  },
  {
    slug: "business",
    label: "Business",
    description:
      "What clients see on your invoices and proposals, and how they pay you.",
  },
  {
    slug: "billing",
    label: "Plan & billing",
    description: "Your Clentric plan and what you've used.",
  },
] as const satisfies readonly {
  slug: string;
  label: string;
  description: string;
}[];

export type SettingsTab = (typeof SETTINGS_TABS)[number];
export type SettingsSlug = SettingsTab["slug"];

/** Where /settings lands. */
export const DEFAULT_SETTINGS_TAB: SettingsTab = SETTINGS_TABS[0];

/**
 * Section URLs from before settings became three tabs. Links to them (old
 * bookmarks, emails) redirect to the tab that now holds that section.
 */
export const LEGACY_SETTINGS_SLUGS: Record<string, SettingsSlug> = {
  profile: "account",
  security: "account",
  payments: "business",
  plan: "billing",
};

export function getSettingsTab(
  slug: string | null | undefined,
): SettingsTab | undefined {
  return SETTINGS_TABS.find((tab) => tab.slug === slug);
}
