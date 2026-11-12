import * as v from "valibot"

export const GithubContributorSchema = v.object({
    login: v.string(),
    id: v.pipe(v.number(), v.integer()),
    node_id: v.string(),
    avatar_url: v.pipe(v.string(), v.url()),
    gravatar_id: v.string(),
    url: v.pipe(v.string(), v.url()),
    html_url: v.pipe(v.string(), v.url()),
    type: v.union([v.literal("User"), v.literal("Bot")]),
    contributions: v.pipe(v.number(), v.integer())
})

export const GithubRepoSchema = v.object({
    stargazers_count: v.nullable(v.pipe(v.number(), v.integer()))
})

export type GithubContributor = v.InferOutput<typeof GithubContributorSchema>;