<script lang="ts" module>
  const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  let scriptPromise: Promise<void> | null = null;

  function loadTurnstileScript(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.turnstile) return Promise.resolve();
    scriptPromise ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Turnstile"));
      document.head.appendChild(script);
    });
    return scriptPromise;
  }
</script>

<script lang="ts">
  type Props = {
    siteKey: string;
    token?: string | null;
  };

  // eslint-disable-next-line no-useless-assignment -- write-only bindable: parent reads it, this component never does
  let { siteKey, token = $bindable(null) }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let widgetId: string | null = null;

  $effect(() => {
    if (!containerEl) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerEl || !window.turnstile) return;
        widgetId = window.turnstile.render(containerEl, {
          sitekey: siteKey,
          callback: (t: string) => {
            token = t;
          },
          "expired-callback": () => {
            token = null;
          },
          "error-callback": () => {
            token = null;
          },
        });
      })
      .catch((error) => {
        console.error("Turnstile failed to load:", error);
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
        widgetId = null;
      }
    };
  });
</script>

<div bind:this={containerEl} class="turnstile-widget"></div>

<style>
  .turnstile-widget {
    display: flex;
    justify-content: center;
  }
</style>
