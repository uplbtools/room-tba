import { queryStore } from "@lib/store.svelte";
import type { AppContextData } from "@lib/context";
import type { ProposalEntityType } from "@lib/services/proposal-service";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
} from "@lib/types";

type PublishedRow = { id: number };

function openEntityId(
  data: AppContextData,
  category: typeof queryStore.category,
  queryValue: string,
): number | null {
  if (!data.loaded || !category || !queryValue) return null;

  switch (category) {
    case "building": {
      const row = data.buildings.find((b) => b.buildingName === queryValue);
      return row?.id ?? null;
    }
    case "dorm": {
      const row = data.dorms.find((d) => d.dormName === queryValue);
      return row?.id ?? null;
    }
    case "college": {
      const row = data.colleges.find((c) => c.collegeName === queryValue);
      return row?.id ?? null;
    }
    case "division": {
      const row = data.divisions.find((d) => d.divisionName === queryValue);
      return row?.id ?? null;
    }
    case "event": {
      const row = data.events.find(
        (e) =>
          e.title === queryValue || e.slug === queryStore.selectedEventSlug,
      );
      return row?.id ?? null;
    }
    default:
      return null;
  }
}

/** Keep the open side panel pointed at the entity after approve renames it. */
export function syncOpenEntityQueryAfterPublish(
  getData: () => AppContextData,
  entityType: ProposalEntityType,
  published: unknown,
): void {
  if (!published || typeof published !== "object" || !("id" in published)) {
    return;
  }
  const publishedId = Number((published as PublishedRow).id);
  if (!Number.isInteger(publishedId)) return;

  const data = getData();
  const openId = openEntityId(data, queryStore.category, queryStore.queryValue);
  if (openId !== publishedId) return;

  switch (entityType) {
    case "building":
    case "create_building": {
      const row = published as BuildingData;
      queryStore.hydrateQuery({
        type: "result",
        category: "building",
        value: row.buildingName,
      });
      return;
    }
    case "dorm":
    case "create_dorm": {
      const row = published as DormData;
      queryStore.hydrateQuery({
        type: "result",
        category: "dorm",
        value: row.dormName,
      });
      return;
    }
    case "college":
    case "create_college": {
      const row = published as CollegeData;
      queryStore.hydrateQuery({
        type: "result",
        category: "college",
        value: row.collegeName,
      });
      return;
    }
    case "division":
    case "create_division": {
      const row = published as DivisionData;
      queryStore.hydrateQuery({
        type: "result",
        category: "division",
        value: row.divisionName,
      });
      return;
    }
    case "event":
    case "create_event": {
      const row = published as EventData;
      queryStore.hydrateQuery({
        type: "result",
        category: "event",
        value: row.title,
        eventSlug: row.slug,
      });
      return;
    }
    default:
      return;
  }
}
