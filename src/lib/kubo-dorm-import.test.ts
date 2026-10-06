import { expect, test } from "bun:test";
import { parseKuboDormImports } from "./kubo-dorm-import";

test("maps Kubo dorm details without guessing housing policy", () => {
  expect(
    parseKuboDormImports([
      {
        name: "Sample Residence",
        location: { lat: 14.16, lng: 121.24, address: "Batong Malake" },
        rules: ["Female Only"],
        maxCapacity: 12,
        minPrice: 2500,
        amenities: [{ name: "WiFi" }, { name: "WiFi" }],
        otherAmenities: ["Laundry"],
        contactNumbers: ["0917 000 0000"],
        facebookUrl: "https://facebook.com/sample",
        markerImageUrl: "https://media.kubo.community/sample.thumb.webp",
      },
      {
        name: "Unknown Policy Housing",
        location: { lat: 14.17, lng: 121.25 },
        rules: ["No curfew"],
      },
    ]),
  ).toEqual([
    {
      dormName: "Sample Residence",
      gender: "female",
      lat: 14.16,
      lon: 121.24,
      capacity: 12,
      amenities: ["WiFi", "Laundry"],
      description: "Address: Batong Malake",
      isUpManaged: false,
      priceRange: "From ₱2,500/month",
      contactPhone: ["0917 000 0000"],
      facebookLink: "https://facebook.com/sample",
      imageUrl: "https://media.kubo.community/sample.thumb.webp",
    },
    {
      dormName: "Unknown Policy Housing",
      gender: "unspecified",
      lat: 14.17,
      lon: 121.25,
      capacity: null,
      amenities: null,
      description: null,
      isUpManaged: false,
      priceRange: null,
      contactPhone: null,
      facebookLink: null,
      imageUrl: null,
    },
  ]);
});

test("rejects incomplete Kubo records", () => {
  expect(parseKuboDormImports([{ name: "No map pin" }])).toBeNull();
});
