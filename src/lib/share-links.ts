import { absoluteUrl, slugifySegment } from "./site";

export function getBuildingShareUrl(buildingName: string) {
  return absoluteUrl(`/building/${slugifySegment(buildingName)}/`);
}
