import countries from "world-countries";

export function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const countryOptions = countries
  .filter((c) => c.idd.root)
  .map((country) => ({
    label: country.name.common,
    value: country.cca2,
    code: country.cca2,
    flag: getFlagEmoji(country.cca2),
    callingCode: `${country.idd.root ?? ""}${country.idd.suffixes?.[0] ?? ""}`,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
