import fs from "node:fs";

async function fetchOverpass(query: string) {
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
  );
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Overpass returned non-JSON:", text);
    throw e;
  }
}

async function main() {
  const query = `
    [out:json][timeout:25];
    (
      way["name"~"UP Open University"];
      relation["name"~"UP Open University"];
      way["name"~"International Rice Research Institute"];
      relation["name"~"International Rice Research Institute"];
    );
    out geom;
  `;
  const data = await fetchOverpass(query);
  fs.writeFileSync("campus-bounds.json", JSON.stringify(data, null, 2));
  console.log("Fetched bounds");
}
main();
