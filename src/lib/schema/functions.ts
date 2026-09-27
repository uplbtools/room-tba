import * as v from "valibot"

export const FetchType = v.union([
    v.literal("map"),
    v.literal("full")
])

export const EntityFetchOptions = v.object({
    type: FetchType,
})

export const PageIdParam = v.pipe(
    v.optional(v.string()),
    v.toNumber(),
    // v.nan(),
    v.integer("That's not an integer")
)

export const TableId = v.pipe(
    v.union([
        v.pipe(v.optional(v.string()), v.toNumber()), 
        v.number()
    ]), v.integer("You did not enter an integer!!!"));
