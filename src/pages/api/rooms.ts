import { APIRoute } from "astro";
import {
  getBuildingRooms,
  getCollegeRooms,
  getDivisionRooms,
  getRoomByCode,
  searchRooms,
} from "../../lib/services/map-data-service";
import { RoomData } from "../../lib/types";
// import { getAllRooms } from "../../lib/services/map-data-service";

export const GET = (async ({ url }) => {
  const searchKeys = Array.from(url.searchParams.keys());
  if (searchKeys.length !== 1)
    return new Response("Error with your request", {
      status: 400,
      statusText: "Bad request",
    });

  const searchField = searchKeys[0] as string;
  const fieldSets = [
    "building_id",
    "college_id",
    "division_id",
    "code",
    "search_code",
  ];
  if (!fieldSets.includes(searchField))
    return new Response("400 bad request", {
      status: 400,
      statusText: "Bad request",
    });

  if (searchField === "code") {
    const code = url.searchParams.get(searchField) as string;
    const room = await getRoomByCode(code);
    return new Response(
      JSON.stringify(
        {
          data: room,
          success: true,
        },
        null,
        2,
      ),
    );
  }

  if (searchField === "search_code") {
    const searchString = url.searchParams.get(searchField) as string;
    if (searchString === "")
      return new Response(JSON.stringify({ data: [], success: true }, null, 2));
    const rooms = await searchRooms(searchString);
    return new Response(
      JSON.stringify(
        {
          data: rooms,
          success: true,
        },
        null,
        2,
      ),
    );
  }

  const id = parseInt(url.searchParams.get(searchField) as string);
  let data: null | RoomData[] = null;
  if (isNaN(id))
    return new Response("Error with your request", {
      status: 400,
      statusText: "Bad request",
    });

  switch (searchField) {
    case "building_id":
      data = await getBuildingRooms(id);
      break;
    case "college_id":
      data = await getCollegeRooms(id);
      break;
    case "division_id":
      data = await getDivisionRooms(id);
      break;
  }

  if (data?.length === 0)
    return new Response("No data exists", {
      status: 404,
      statusText: "query not found",
    });
  return new Response(
    JSON.stringify(
      {
        data,
        success: true,
      },
      null,
      2,
    ),
    {
      headers: [["Access-Control-Allow-Origin", "*"]],
    },
  );
}) satisfies APIRoute;

export const prerender = false;
