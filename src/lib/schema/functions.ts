import * as v from "valibot"

export const FetchType = v.union([
    v.literal("map"),
    v.literal("full")
])

export const EntityFetchOptions = v.object({
    type: FetchType,
})