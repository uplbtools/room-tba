<script lang="ts">
  /**
   * Reward moment: on the visit after an edit is approved, the submitter gets
   * one toast with the points it earned and their place this month. Runs only
   * for people who have contributed (signed in, or a browser that has sent a
   * proposal), so everyone else costs no request.
   */
  import { onMount } from "svelte";
  import { newBadges, rewardMessage } from "@lib/contributors/scoring";
  import {
    readContributorId,
    readRewardSeen,
    writeRewardSeen,
  } from "@lib/contributors/contributor-id";
  import type { MyStandingResponse } from "@lib/contributors/leaderboard-types";
  import { adminAuthStore, modalStore, toastStore } from "@lib/store.svelte";

  // Let the map and auth settle before asking.
  const CHECK_DELAY_MS = 4000;

  async function check() {
    const contributorId = readContributorId();
    if (!adminAuthStore.isLoggedIn && !contributorId) return;
    const params = new URLSearchParams({ window: "month", board: "community" });
    if (contributorId) params.set("contributorId", contributorId);
    const res = await fetch(`/api/contributors/me?${params}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const { me } = (await res.json()) as MyStandingResponse;
    const latest = me?.recent[0]?.id;
    if (!me || latest == null) return;

    const seen = readRewardSeen();
    writeRewardSeen(latest);
    // First check on this browser for an existing account: start counting
    // from now instead of celebrating its whole history.
    if (seen === null) return;
    const fresh = me.recent.filter((item) => item.id > seen);
    if (fresh.length === 0 || toastStore.message) return;
    const gained = fresh.reduce((sum, item) => sum + item.points, 0);
    const badges = newBadges(
      me.totalContributions - fresh.length,
      me.totalContributions,
    );
    const badgeNote =
      badges.length > 0
        ? `. New badge: ${badges.map((badge) => badge.label).join(", ")}`
        : "";
    toastStore.show(`${rewardMessage(gained, me.rank)}${badgeNote}`, "success", {
      label: "Leaderboard",
      run: () => modalStore.openModal("leaderboard"),
    });
  }

  onMount(() => {
    const timer = setTimeout(() => {
      void check().catch(() => {
        // A missed reward toast is not worth an error.
      });
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  });
</script>
