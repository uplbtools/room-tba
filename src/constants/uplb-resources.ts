import { UPLB_OSA_ORGANIZATIONS_URL, UPLB_TRAIL_URL } from "./community-links";

export type UplbResource = {
  name: string;
  href: string;
  description: string;
  note?: string;
};

export type UplbResourceSection = {
  title: string;
  resources: UplbResource[];
};

/** Official and local sources checked on 11 July 2026. */
export const UPLB_RESOURCE_SECTIONS: UplbResourceSection[] = [
  {
    title: "Start here",
    resources: [
      {
        name: "UPLB main website",
        href: "https://uplb.edu.ph",
        description:
          "University announcements, colleges, and campus information.",
      },
      {
        name: "Office of the University Registrar",
        href: "https://our.uplb.edu.ph",
        description:
          "Registration, academic records, credentials, and admission.",
      },
      {
        name: "AMIS",
        href: "https://amis.uplb.edu.ph",
        description:
          "Block schedules, consent of instructor, and change of matriculation.",
      },
      {
        name: "OVCSA / OSAM",
        href: "https://uplbosa.org",
        description:
          "Student services, financial aid, housing, counseling, clearance, and orgs.",
      },
      {
        name: "UPLB Student Handbook",
        href: "https://uplbosa.org/download/student-handbook",
        description: "Student rules, rights, procedures, and office contacts.",
      },
      {
        name: "University Health Service",
        href: "https://ovcca.uplb.edu.ph/units/university-health-service/",
        description: "Campus hospital and health services.",
      },
      {
        name: "University Library",
        href: "https://library.uplb.edu.ph",
        description: "Library services, databases, and collections.",
      },
      {
        name: "UPLB Directory",
        href: "https://directory.uplb.edu.ph",
        description: "Official office phone and email lookup.",
      },
      {
        name: "Registered organizations",
        href: UPLB_OSA_ORGANIZATIONS_URL,
        description:
          "Current official Office of Student Activities organization list.",
      },
      {
        name: "UPLB Trail",
        href: UPLB_TRAIL_URL,
        description:
          "Searchable local directory of UPLB links and organizations.",
        note: "Use as a discovery aid; confirm time-sensitive details with the source office.",
      },
    ],
  },
  {
    title: "Academics",
    resources: [
      {
        name: "Academic calendars",
        href: "https://our.uplb.edu.ph/academic-calendars/",
        description: "Official term dates and registration deadlines.",
      },
      {
        name: "Registration / SAIS information",
        href: "https://our.uplb.edu.ph/registration/",
        description: "UP-system registration and enlistment guidance.",
      },
      {
        name: "OVCAA",
        href: "https://ovcaa.uplb.edu.ph",
        description: "Academic affairs and university academic units.",
      },
      {
        name: "Peer Tutorial",
        href: "https://uplbosa.org/peertutor",
        description:
          "Free student tutoring through the Learning Resource Center.",
      },
      {
        name: "CAS FAQs",
        href: "https://cas.uplb.edu.ph/faqs/",
        description:
          "Prerog, consent of instructor, waiver, and plan-of-study guidance.",
      },
    ],
  },
  {
    title: "Financial aid and student services",
    resources: [
      {
        name: "Scholarships and grants",
        href: "https://uplbosa.org/scholarships",
        description: "Office of Scholarships and Grants opportunities.",
      },
      {
        name: "Iskolar ng Bayan Program",
        href: "https://uplbosa.org/inb-program",
        description: "Socialized tuition and related assistance information.",
      },
      {
        name: "SAGA student assistantships",
        href: "https://uplbosa.org/saprogram",
        description: "Paid student assistantship program.",
      },
      {
        name: "SLAS",
        href: "https://slasonline.up.edu.ph/",
        description: "UP-system financial assistance portal.",
      },
      {
        name: "Tuition loan / SLB",
        href: "https://uplbosa.org/slb",
        description: "Short-term tuition loan information.",
      },
      {
        name: "Cash Loan Assistance Program",
        href: "https://uplbosa.org/cashloans",
        description: "Emergency cash loan information.",
      },
      {
        name: "University clearance",
        href: "https://uplbosa.org/univ-clearance-process",
        description: "Online clearance process through OSAM.",
      },
      {
        name: "Borrow-A-Laptop Program",
        href: "https://uplbosa.org/scholarships/borrow-a-laptop",
        description: "Laptop lending support for eligible students.",
      },
    ],
  },
  {
    title: "Health, safety, and housing",
    resources: [
      {
        name: "UHS services",
        href: "https://ovcca.uplb.edu.ph/units/university-health-service/uhs-services/",
        description: "Clinic and specialty service details.",
        note: "Confirm clinic schedules and emergency contacts on the live page.",
      },
      {
        name: "Counseling",
        href: "https://uplbosa.org/counseling",
        description: "Office of Counseling and Guidance support.",
      },
      {
        name: "Student housing",
        href: "https://uplbosa.org/housing/dormitories",
        description:
          "Dormitory applications and Office of Student Housing information.",
      },
      {
        name: "Dorm fees",
        href: "https://uplbosa.org/housing/dorm-fees",
        description: "Current dormitory fee information.",
      },
      {
        name: "Dorm application guidelines",
        href: "https://uplbosa.org/download/dorm-app-guidelines",
        description: "Regular-term application process.",
      },
      {
        name: "Midyear dorm application guidelines",
        href: "https://uplbosa.org/download/dorm-app-guidelines-midyear",
        description: "Midyear application process.",
      },
      {
        name: "Transient accommodation guidelines",
        href: "https://uplbosa.org/download/transient-guidelines",
        description: "Short-term campus accommodation information.",
      },
      {
        name: "UPLB accommodation overview",
        href: "https://uplb.edu.ph/on-campus/accommodation/",
        description: "On-campus housing overview by student category.",
      },
    ],
  },
  {
    title: "Campus life",
    resources: [
      {
        name: "Apply for organization registration",
        href: "https://uplbosa.org/page-recognition",
        description: "Start or renew student organization recognition.",
      },
      {
        name: "UPLB Perspective",
        href: "https://uplbperspective.wordpress.com",
        description: "Official student publication and campus news.",
      },
      {
        name: "UPLB University Student Council",
        href: "https://www.facebook.com/UPLBUSC/",
        description: "Student government updates.",
        note: "Facebook-only source; verify current announcements independently.",
      },
      {
        name: "Project Sablay",
        href: "https://uplbosa.org/project-sablay",
        description: "Graduation regalia program.",
      },
      {
        name: "OVCSA Spaces",
        href: "https://uplbosa.org/ovcsa-spaces",
        description: "Campus space and venue booking.",
      },
    ],
  },
  {
    title: "College and library links",
    resources: [
      {
        name: "College of Arts and Sciences",
        href: "https://cas.uplb.edu.ph",
        description: "CAS announcements, offices, and student guidance.",
      },
      {
        name: "Library catalog (OPAC)",
        href: "https://koha.uplb.edu.ph",
        description: "Search the UPLB library catalog and manage your account.",
      },
      {
        name: "CEAT Library",
        href: "https://ceatlibrary.uplb.edu.ph",
        description:
          "Engineering and agro-industrial technology library resources.",
      },
    ],
  },
  {
    title: "Community advice (anecdotal)",
    resources: [
      {
        name: "r/peyups",
        href: "https://www.reddit.com/r/peyups/",
        description: "UP student discussion and experience-sharing.",
        note: "Not official policy; verify claims with the responsible UPLB office.",
      },
      {
        name: "r/UPElbi",
        href: "https://www.reddit.com/r/UPElbi/",
        description: "UPLB-focused student discussion and advice.",
        note: "Not official policy; verify claims with the responsible UPLB office.",
      },
    ],
  },
];
