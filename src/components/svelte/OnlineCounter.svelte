<script lang="ts">
  import { onMount } from "svelte";

  let online = $state(0);
  
  onMount(() => {
    online = Math.floor(Math.random() * (150 - 20) + 20);
    
    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 5) - 2;
      online = Math.max(1, online + change);
    }, 5000);
    
    return () => clearInterval(interval);
  });
</script>

<div class="online-counter" title="{online} online now">
  <div class="pulse-dot"></div>
  <span class="online-text">
    {#if online > 0}
      {online} online
    {:else}
      --
    {/if}
  </span>
</div>

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

  .pulse-dot {
    width: 0.5rem;
    height: 0.5rem;
    background-color: hsl(142, 70%, 40%);
    border-radius: 50%;
    position: relative;
    flex-shrink: 0;
  }

  .pulse-dot::after {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background-color: hsl(142, 70%, 40%);
    opacity: 0.5;
    animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
  }
</style>
