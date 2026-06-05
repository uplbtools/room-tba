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
      { name: "Olivarez Plaza Mall", lat: 14.17903, lon: 121.23908 },
      { name: "Robinsons Town Mall", lat: 14.177349211032917, lon: 121.24242089688644 },
      { name: "Carabao Park / DevCom", lat: 14.167680673655115, lon: 121.24302990984792 },
      { name: "Raymundo Gate", lat: 14.16773707639881, lon: 121.2416075132719 },
      { name: "CAP-CSI", lat: 14.167227355646022, lon: 121.24044598783846 },
      { name: "Sacay", lat: 14.166436241690047, lon: 121.23861696327558 },
      { name: "Main Library", lat: 14.165440954550126, lon: 121.2386041983236 },
      { name: "Graduate School / Umali", lat: 14.163742377049818, lon: 121.23998877527784 },
      { name: "Women's Dormitory", lat: 14.162362067987052, lon: 121.24056837513993 },
      { name: "Men's Dormitory", lat: 14.16091203484906, lon: 121.2412408051354 },
      { name: "Baker Hall", lat: 14.161219041586817, lon: 121.24257006568956 },
      { name: "Animal Husbandry", lat: 14.15989413929804, lon: 121.24366990769977 },
      { name: "Agronomy Building", lat: 14.160182373364517, lon: 121.2443733752706 },
      { name: "College of Engineering and Agro-Industrial Technology", lat: 14.16087221013792, lon: 121.24495080555562 },
      { name: "Senior's Social Garden", lat: 14.162690186117826, lon: 121.2438403651636 },
      { name: "Headquarters", lat: 14.16352431907233, lon: 121.2437220269563 },
      { name: "St. Therese / Math Building", lat: 14.165120117289403, lon: 121.24456008780996 },
      { name: "Makiling School", lat: 14.165744564457338, lon: 121.24426410223518 },
      { name: "Carabao Park / Landbank", lat: 14.167026218728786, lon: 121.24373658223566 },
      { name: "Olivarez Plaza Mall", lat: 14.17903, lon: 121.23908 },
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
