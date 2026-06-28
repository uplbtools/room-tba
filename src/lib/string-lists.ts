/** Normalize text[] values that may include literal quote wrappers or JSON blobs. */
export function normalizeStringList(value: unknown): string[] {
  if (value == null) return [];

  let items: unknown[];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        items = Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        items = [trimmed];
      }
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      items = trimmed.slice(1, -1).split(",").map((part) => part.trim());
    } else {
      items = [trimmed];
    }
  } else {
    return [];
  }

  return items
    .map((item) => {
      if (item == null) return "";
      let text = String(item).trim();
      if (
        (text.startsWith("'") && text.endsWith("'")) ||
        (text.startsWith('"') && text.endsWith('"'))
      ) {
        text = text.slice(1, -1).trim();
      }
      return text;
    })
    .filter((text) => text.length > 0 && text !== "]" && text !== "[");
}
