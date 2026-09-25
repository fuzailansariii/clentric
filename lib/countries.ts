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
    // A single suffix completes the code (India: "+9" + "1"). Several mean
    // the suffixes are area codes under a shared code (US/Canada list 200+
    // under "+1"), so the root alone is the dial code — otherwise the US
    // came out as "+1201".
    callingCode:
      country.idd.suffixes?.length === 1
        ? `${country.idd.root}${country.idd.suffixes[0]}`
        : (country.idd.root ?? ""),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
