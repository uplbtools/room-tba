export function hasLocation(obj: { lon: number | null, lat: number | null } & Record<string, unknown>): obj is ({ lon: number, lat: number } & Record<string, unknown>) {
    return obj.lon !== null && obj.lat !== null;
}