<script lang="ts">
  import { onMount } from "svelte";

  /**
   * Real presence: heartbeat an anonymous session id to /api/presence and show
   * the count it returns. The id is a random UUID scoped to this tab's
   * sessionStorage — never tied to an account, and nothing else is sent.
   */
  let online = $state(0);

  const HEARTBEAT_MS = 30_000;
  const SID_KEY = "rt-presence-sid";

  function sessionId() {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  }

  async function heartbeat() {
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sessionId() }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { online?: number };
      if (typeof data.online === "number") online = data.online;
    } catch {
      // Offline or API down: keep the last known count (0 renders nothing).
    }
  }

  onMount(() => {
    heartbeat();
    const interval = setInterval(heartbeat, HEARTBEAT_MS);

    return () => clearInterval(interval);
  });
</script>

<!-- Hidden until someone besides you is here: "--" before the first
     heartbeat and "1 online" (just you) both read as a dead app. -->
{#if online >= 2}
  <div class="online-counter" role="status">
    <div class="presence-dot" aria-hidden="true"></div>
    <span class="online-text">{online} people online now</span>
  </div>
{/if}

<style>
  .online-counter {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.75rem; /* Match map chrome toggle size */
    padding: 0 0.875rem;
    background: var(--map-chrome-surface, white);
    border: 1px solid var(--map-chrome-border, #ccc);
    border-radius: var(--map-chrome-radius, 1rem);
    box-shadow: var(--map-chrome-shadow, 0 1px 3px rgba(0,0,0,0.1));
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 25%);
    white-space: nowrap;
    user-select: none;
    pointer-events: auto;
    box-sizing: border-box;
  }

  /* Static on purpose: a pulsing dot read as noise in the App menu. */
  .presence-dot {
    width: 0.5rem;
    height: 0.5rem;
    background-color: hsl(142, 70%, 40%);
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
