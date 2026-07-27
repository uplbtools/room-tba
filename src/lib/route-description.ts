/**
 * Prose for a campus walking route.
 *
 * The AI pass is optional and off by default, matching how RESEND and
 * TURNSTILE are handled here: no key, no call, and a plain fallback instead of
 * an error. That keeps local dev and forks working, and it means a crawler or
 * a burst of traffic can never turn into a surprise bill.
 */
import type { CampusRoute, RoutePlace } from "./campus-route";
import { formatDistance, formatDuration } from "./campus-route";

const MODEL = "claude-haiku-4-5-20251001";

function turnWord(modifier: string | null): string {
  if (!modifier) return "continue";
  if (modifier.includes("left")) return "turn left";
  if (modifier.includes("right")) return "turn right";
  if (modifier === "straight") return "keep going straight";
  return "continue";
}

/**
 * Deterministic description from the route data alone. Also the input the AI
 * pass rewrites, so the facts it states are ours rather than the model's.
 */
export function describeRoute(
  from: RoutePlace,
  to: RoutePlace,
  route: CampusRoute,
): string {
  const lines: string[] = [
    `Walk from ${from.name} to ${to.name}: ${formatDistance(route.meters)}, about ${formatDuration(route.seconds)} on foot.`,
  ];

  // Consecutive turns often sit near the same building, and "by CEM Building"
  // three lines running reads like a stutter rather than a cue.
  let lastLandmark: string | null = null;

  for (const step of route.steps) {
    if (step.maneuver === "depart") {
      lines.push(
        `Start at ${from.name}${step.landmark && step.landmark !== from.name ? ` (near ${step.landmark})` : ""}.`,
      );
      continue;
    }
    if (step.maneuver === "arrive") {
      lines.push(`Arrive at ${to.name}.`);
      continue;
    }
    // Skip the shuffling between footpath segments; only turns worth calling.
    if (step.meters < 25) continue;
    const fresh = step.landmark && step.landmark !== lastLandmark;
    if (step.landmark) lastLandmark = step.landmark;
    const where = fresh ? ` by ${step.landmark}` : "";
    lines.push(
      `After ${formatDistance(step.meters)}${where}, ${turnWord(step.modifier)}.`,
    );
  }

  return lines.join("\n");
}

/**
 * Rewrites the factual description into something a student would say out
 * loud. Returns null when unavailable so callers fall back to describeRoute:
 * the API key being unset is the normal case, not a failure.
 */
export async function generateRouteDescription(
  from: RoutePlace,
  to: RoutePlace,
  route: CampusRoute,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const facts = describeRoute(from, to, route);
  if (!apiKey?.trim()) return null;

  const prompt = [
    "You are writing walking directions for a University of the Philippines Los Banos student.",
    "Rewrite the notes below as 2 to 4 short sentences, second person, plain and calm.",
    "",
    "Rules:",
    "- Use only the facts in the notes. Do not invent landmarks, room numbers, shortcuts, or travel times.",
    "- Keep every building name exactly as written.",
    "- No preamble, no sign-off, no markdown, no em dashes.",
    "- Mention the total distance and walking time once.",
    "",
    "Notes:",
    facts,
  ].join("\n");

  try {
    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}
