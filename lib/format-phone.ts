export function formatPhone(phone: string | null) {
  if (!phone) return "—";
  const match = phone.match(/^(\+\d{1,3})\s+(.+)$/);
  if (!match) return phone;
  const [, countryCode, number] = match;
  return `(${countryCode}) ${number}`;
}
