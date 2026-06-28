/** Normalize text[] values that may include literal quote wrappers or JSON blobs. */
export function normalizeStringList(value: unknown): string[] {
  if (value == null) return [];

  const items = flattenToItems(value);
  return items
    .map((item) => stripWrappingQuotes(String(item).trim()))
    .filter((text) => text.length > 0 && text !== "]" && text !== "[");
}

function flattenToItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        const nested = flattenToItems(item);
        if (nested.length > 1 || (nested.length === 1 && nested[0] !== item)) {
          return nested;
        }
      }
      return [item];
    });
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? flattenToItems(parsed) : [trimmed];
    } catch {
      const parsed = parseDelimitedList(trimmed.slice(1, -1));
      return parsed.length > 0 ? parsed : [trimmed];
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const parsed = parseDelimitedList(trimmed.slice(1, -1));
    return parsed.length > 0 ? parsed : [trimmed];
  }

  return [trimmed];
}

function parseDelimitedList(content: string): string[] {
  const items: string[] = [];
  let index = 0;

  while (index < content.length) {
    while (
      index < content.length &&
      (content[index] === "," || content[index] === " ")
    ) {
      index += 1;
    }
    if (index >= content.length) break;

    const quote = content[index];
    if (quote === "'" || quote === '"') {
      index += 1;
      let value = "";
      while (index < content.length) {
        if (content[index] === "\\" && index + 1 < content.length) {
          value += content[index + 1];
          index += 2;
          continue;
        }
        if (content[index] === quote) {
          index += 1;
          break;
        }
        value += content[index];
        index += 1;
      }
      items.push(value);
      continue;
    }

    let value = "";
    while (index < content.length && content[index] !== ",") {
      value += content[index];
      index += 1;
    }
    const trimmed = value.trim();
    if (trimmed) items.push(trimmed);
  }

  return items;
}

function stripWrappingQuotes(text: string): string {
  let value = text;
  let changed = true;

  while (changed && value.length >= 2) {
    changed = false;
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      value = value.slice(1, -1).trim();
      changed = true;
    }
  }

  return value;
}

export function normalizeDormListFields<
  T extends { amenities?: unknown; contactPhone?: unknown },
>(dorm: T): T {
  return {
    ...dorm,
    amenities: normalizeStringList(dorm.amenities),
    contactPhone: normalizeStringList(dorm.contactPhone),
  };
}
