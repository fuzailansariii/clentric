export function normalize<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key in result) {
    if (result[key] === "") {
      result[key] = null as never;
    }
  }
  return result;
}
