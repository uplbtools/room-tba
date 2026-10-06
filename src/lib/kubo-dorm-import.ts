export type KuboDormImport = {
  dormName: string;
  gender: string;
  lat: number;
  lon: number;
  capacity: number | null;
  amenities: string[] | null;
  description: string | null;
  isUpManaged: false;
  priceRange: string | null;
  contactPhone: string[] | null;
  facebookLink: string | null;
  imageUrl: string | null;
};

/** Maps Kubo's public dorm detail response into Room TBA's existing fields. */
export function parseKuboDormImports(value: unknown): KuboDormImport[] | null {
  if (!Array.isArray(value)) return null;
  const imports = value.map(parseKuboDormImport);
  return imports.every((item): item is KuboDormImport => item !== null)
    ? imports
    : null;
}

function parseKuboDormImport(value: unknown): KuboDormImport | null {
  if (!isRecord(value) || !isRecord(value.location)) return null;
  const name = text(value.name);
  const lat = value.location.lat;
  const lon = value.location.lng;
  if (
    !name ||
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  )
    return null;

  const rules = strings(value.rules);
  const address = text(value.location.address);
  const description =
    text(value.description) ?? (address ? `Address: ${address}` : null);
  const amenities = [
    ...stringsFromRecords(value.amenities),
    ...strings(value.otherAmenities),
  ];
  const phoneNumbers = strings(value.contactNumbers);
  const maxCapacity = value.maxCapacity;
  const minPrice = value.minPrice;

  return {
    dormName: name,
    gender: genderFrom(name, rules),
    lat,
    lon,
    capacity:
      Number.isInteger(maxCapacity) && maxCapacity >= 0 ? maxCapacity : null,
    amenities: amenities.length ? [...new Set(amenities)] : null,
    description,
    isUpManaged: false,
    priceRange:
      typeof minPrice === "number" && minPrice > 0
        ? `From ₱${minPrice.toLocaleString("en-PH")}/month`
        : null,
    contactPhone: phoneNumbers.length ? phoneNumbers : null,
    facebookLink: safeUrl(value.facebookUrl),
    imageUrl: safeUrl(value.markerImageUrl) ?? firstSafeUrl(value.images),
  };
}

function genderFrom(name: string, rules: string[]): string {
  const text = `${name} ${rules.join(" ")}`.toLowerCase();
  if (/female only|\(female\)/.test(text)) return "female";
  if (/male only|\(male\)/.test(text)) return "male";
  if (/co[- ]?ed|mixed rooms|boys and girls/.test(text)) return "coed";
  return "unspecified";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string" && item.trim() ? [item.trim()] : [],
      )
    : [];
}

function stringsFromRecords(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) =>
        isRecord(item) && text(item.name) ? [text(item.name)!] : [],
      )
    : [];
}

function firstSafeUrl(value: unknown): string | null {
  return Array.isArray(value)
    ? (value.map(safeUrl).find(Boolean) ?? null)
    : null;
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
