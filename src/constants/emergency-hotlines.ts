export type EmergencyHotline = {
  name: string;
  numbers: readonly string[];
};

// Ordered by who you call first in an emergency: the national line, then
// medical, then campus security, then everyone else.
export const EMERGENCY_HOTLINE_CATEGORIES = [
  {
    name: "National",
    entries: [{ name: "National Emergency Hotline", numbers: ["911"] }],
  },
  {
    name: "Medical",
    entries: [
      {
        name: "University Health Service",
        numbers: [
          "(049) 536-3247",
          "(049) 536-6238",
          "(049) 536-2470",
          "0915 802 2211",
          "0998 346 6070",
        ],
      },
      {
        name: "Los Baños Doctors Hospital",
        numbers: ["0906 399 2757", "(049) 536 0100"],
      },
      {
        name: "Healthserv Los Baños Medical Center",
        numbers: ["0917 301 6646"],
      },
    ],
  },
  {
    name: "University",
    entries: [
      {
        name: "UPLB Security and Safety Office",
        numbers: ["0906 043 3288", "0921 890 1259"],
      },
      {
        name: "University Planning and Maintenance Office",
        numbers: ["0917 882 2479"],
      },
    ],
  },
  {
    name: "Local",
    entries: [
      {
        name: "Barangay Batong Malake",
        numbers: ["0919 254 4257", "0995 107 9907"],
      },
      {
        name: "Los Baños Police Station",
        numbers: ["0927 509 1198", "0998 598 5649"],
      },
      {
        name: "Los Baños Fire Station",
        numbers: ["0939 432 5837", "(049) 536 7965"],
      },
      { name: "Municipal DRRMO", numbers: ["0977 204 9641"] },
      {
        name: "Provincial DRRMO",
        numbers: ["(049) 501 4672", "(049) 501 2628"],
      },
    ],
  },
  {
    name: "Student-led",
    entries: [{ name: "Serve the People Brigade", numbers: ["0961 396 3441"] }],
  },
] as const satisfies readonly {
  name: string;
  entries: readonly EmergencyHotline[];
}[];

/** E.164 tel: link. Short codes (911) dial as-is. */
export function emergencyHotlineTel(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length <= 4) return `tel:${digits}`;
  return `tel:${digits.startsWith("0") ? `+63${digits.slice(1)}` : `+${digits}`}`;
}

/**
 * One display format for every number: mobiles as "0917 882 2479",
 * Laguna landlines as "(049) 536 3247". Anything else is left as written.
 */
export function formatHotlineNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (/^0\d{9}$/.test(digits)) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return number;
}

/** Every hotline as a vCard 3.0 file, so phones can import them in one go. */
export function emergencyHotlinesVCard(
  categories: readonly {
    name: string;
    entries: readonly EmergencyHotline[];
  }[] = EMERGENCY_HOTLINE_CATEGORIES,
) {
  const vcardEscape = (value: string) => value.replace(/([\\,;])/g, "\\$1");
  return categories
    .flatMap((category) =>
      category.entries.map((entry) =>
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${vcardEscape(entry.name)}`,
          `N:${vcardEscape(entry.name)};;;;`,
          `ORG:${vcardEscape(`Emergency (${category.name})`)}`,
          ...entry.numbers.map(
            (number) =>
              `TEL;TYPE=VOICE:${emergencyHotlineTel(number).slice("tel:".length)}`,
          ),
          "END:VCARD",
        ].join("\r\n"),
      ),
    )
    .join("\r\n");
}
