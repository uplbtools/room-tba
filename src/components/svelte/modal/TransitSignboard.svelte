<script lang="ts">
  type Props = {
    lines: readonly string[];
    /** Green for campus jeeps, yellow for buses, red for town jeeps. */
    tone?: "green" | "yellow" | "red";
    /** Runs along the bottom edge. */
    lineColor?: string;
    small?: boolean;
  };

  let { lines, tone = "green", lineColor, small = false }: Props = $props();
</script>

<!-- Styled after the black acrylic signs on jeep windshields. -->
<span
  class="signboard signboard--{tone}"
  class:signboard--small={small}
  class:signboard--edged={!!lineColor}
  style:--line-color={lineColor}
>
  {#each lines as line (line)}
    <span class="signboard__line">{line}</span>
  {/each}
</span>

<style>
  .signboard {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.375rem 0.75rem 0.3125rem;
    border: 1px solid #c9c3b6;
    border-radius: 0.25rem;
    background: #12110f;
    box-shadow:
      inset 0 0 0 2px #12110f,
      inset 0 0 0 3px #3a3631;
    color: #70e500;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.15;
    text-transform: uppercase;
    text-shadow: 1px 1px 0 #2a5400;
    white-space: nowrap;
  }

  .signboard--edged {
    border-bottom: 4px solid var(--line-color);
  }

  .signboard--small {
    padding: 0.1875rem 0.4375rem;
    font-size: 0.6875rem;
    line-height: 1.1;
  }

  .signboard--yellow {
    color: #e5e500;
    text-shadow: 1px 1px 0 #5a5a00;
  }

  .signboard--red {
    color: #ff5a3c;
    text-shadow: 1px 1px 0 #5a1400;
  }
</style>
