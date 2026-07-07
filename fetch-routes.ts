import fs from "node:fs";
import { JEEPNEY_ROUTES } from "./src/constants/jeepney-routes.ts";

async function fetchRoutes() {
  const geometries = {};
  for (const route of JEEPNEY_ROUTES) {
    const coordsParam = route.stops.map((s) => `${s.lon},${s.lat}`).join(";");
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
    console.log("Fetching", url);
    const res = await fetch(url);
    const data = await res.json();
    geometries[route.id] = data.routes?.[0]?.geometry || null;
  }
  fs.writeFileSync(
    "./src/constants/jeepney-geometries.json",
    JSON.stringify(geometries, null, 2),
  );
}

fetchRoutes();
