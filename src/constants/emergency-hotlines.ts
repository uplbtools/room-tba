export type EmergencyHotline = {
  name: string;
  numbers: readonly string[];
};

export const EMERGENCY_HOTLINE_CATEGORIES = [
  {
    name: "Student-led",
    entries: [{ name: "Serve the People Brigade", numbers: ["0961 396 3441"] }],
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
] as const satisfies readonly {
  name: string;
  entries: readonly EmergencyHotline[];
}[];

export function emergencyHotlineTel(number: string) {
  const digits = number.replace(/\D/g, "");
  return `tel:${digits.startsWith("0") ? `+63${digits.slice(1)}` : `+${digits}`}`;
}
