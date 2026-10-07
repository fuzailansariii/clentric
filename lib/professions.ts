/** What a freelancer does, as stored in users.profession. */
export const PROFESSIONS = [
  "developer",
  "designer",
  "writer",
  "consultant",
  "other",
] as const;

export type Profession = (typeof PROFESSIONS)[number];

export const PROFESSION_LABELS: Record<Profession, string> = {
  developer: "Developer",
  designer: "Designer",
  writer: "Writer",
  consultant: "Consultant",
  other: "Other",
};

export function isProfession(value: string | null): value is Profession {
  return (PROFESSIONS as readonly string[]).includes(value ?? "");
}

/**
 * Label for display. "Other" says nothing on a document, so it prints as
 * nothing; a value from before the select existed prints as written.
 */
export function formatProfession(value: string | null): string | null {
  if (!value || value === "other") return null;
  return isProfession(value) ? PROFESSION_LABELS[value] : value;
}
