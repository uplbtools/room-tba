import type { APIRoute } from "astro";
import { updateDorm } from "../../../../lib/services/admin-service";

export const prerender = false;

type DormPatchBody = {
  dormName?: string;
  shortName?: string;
  lat?: number | null;
  lon?: number | null;
  gender?: string;
  capacity?: number | null;
  managingOffice?: string | null;
  contactEmail?: string | null;
  amenities?: string[];
  osmLink?: string | null;
  description?: string | null;
  isUpManaged?: boolean;
  priceRange?: string | null;
  contactPhone?: string[];
  facebookLink?: string | null;
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid dorm ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: DormPatchBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.dormName || body.dormName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Dorm name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await updateDorm(id, {
      dormName: body.dormName.trim(),
      shortName: body.shortName || null,
      lat: body.lat ? Number(body.lat) : null,
      lon: body.lon ? Number(body.lon) : null,
      gender: body.gender || "Mixed",
      capacity: body.capacity ? Number(body.capacity) : null,
      managingOffice: body.managingOffice || null,
      contactEmail: body.contactEmail || null,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      osmLink: body.osmLink || null,
      description: body.description || null,
      isUpManaged: body.isUpManaged !== false,
      priceRange: body.priceRange || null,
      contactPhone: Array.isArray(body.contactPhone) ? body.contactPhone : [],
      facebookLink: body.facebookLink || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update dorm:", err);
    return new Response(JSON.stringify({ error: "Failed to save dorm" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
