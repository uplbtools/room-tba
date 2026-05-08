export type JeepneyStop = {
  name: string;
  lat: number;
  lon: number;
};

export type JeepneyRoute = {
  id: string;
  name: string;
  description: string;
  color: string;
  stops: JeepneyStop[];
};

export const JEEPNEY_ROUTES: JeepneyRoute[] = [
  {
    id: "kaliwa-kanan",
    name: "Kaliwa / Kanan",
    description: "Mock loop around the main UPLB campus.",
    color: "#dc2626",
    stops: [
      { name: "Carabao Park", lat: 14.16384, lon: 121.24134 },
      { name: "Maquiling / SU", lat: 14.1668, lon: 121.2438 },
      { name: "IPB Junction", lat: 14.16458, lon: 121.24555 },
      { name: "College of Engineering", lat: 14.1627, lon: 121.24378 },
      { name: "Senior's Social Garden", lat: 14.16195, lon: 121.24281 },
      { name: "Carabao Park", lat: 14.16384, lon: 121.24134 },
    ],
  },
  {
    id: "forestry",
    name: "Forestry",
    description: "Mock route from main campus down to the Forestry area.",
    color: "#15803d",
    stops: [
      { name: "Carabao Park", lat: 14.16384, lon: 121.24134 },
      { name: "DA-PhilRice", lat: 14.16035, lon: 121.23972 },
      { name: "CFNR Gate", lat: 14.157, lon: 121.2372 },
      { name: "CFNR Building", lat: 14.1543, lon: 121.2353 },
      { name: "Forestry Biological Sciences", lat: 14.1548, lon: 121.2358 },
    ],
  },
];
