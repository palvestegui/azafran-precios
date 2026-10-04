/**
 * Deep sanitization utility for Firestore payloads.
 * Strips all undefined fields recursively to prevent Firestore driver rejection.
 * Strict TypeScript: zero 'any', zero '@ts-ignore'.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively removes all keys whose value is undefined.
 * Preserves null, primitives, arrays, and valid nested objects.
 */
export function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (isPlainObject(input)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }

  return input;
}
