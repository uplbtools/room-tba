import { query } from "$app/server";
import { error } from "@sveltejs/kit";
import wretch from "wretch";
import * as v from "valibot"
import { GithubContributorSchema, GithubRepoSchema } from "#lib/schema/github.js";
import { isVisibleGithubContributor } from "#lib/utils/github-contributors.js";

const GITHUB_REPO = 'uplbtools/room-tba';


export const getGithubContributors = query(async () => {

    const res = await wretch(`https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=100`)
        .headers({
            Accept: 'application/vnd.github+json',
            'User-Agent': 'room-tba'
        })
        .get()
        .error(403, () => error(503, "Failed to load GitHub contributors"))
        .json();

    const parsedResult = v.parse(v.array(GithubContributorSchema), res);
    const filteredResult = parsedResult.filter(contributor =>
        contributor.type === "User" && isVisibleGithubContributor(contributor.login)
    )

    return filteredResult;
})

export const getGithubStars = query(async () => {
    const res = await wretch(`https://api.github.com/repos/${GITHUB_REPO}`)
        .headers({
            Accept: 'application/vnd.github+json',
            'User-Agent': 'room-tba'
        })
        .get()
        .error(403, () => error(503, "Failed to load GitHub contributors"))
        .json();

    const { stargazers_count: githubStars } = v.parse(GithubRepoSchema, res);

    if (githubStars == null) error(502, "Invalid Github stars payload");



    return { stars: githubStars };
})