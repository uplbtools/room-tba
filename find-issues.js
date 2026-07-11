import fs from "fs";

const data = JSON.parse(fs.readFileSync("/home/stimmie/dev/uplbtools/room-tba/issues.json", "utf8"));
const withStaging = data.filter(i => i.body && i.body.toLowerCase().includes("last verified against staging"));
console.log(withStaging.map(i => i.number).join(","));
