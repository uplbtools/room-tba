<script lang="ts">
  import { nameInitials, nameColor } from "@lib/avatar";

  type Props = {
    name: string;
    size?: number;
  };

  let { name, size = 28 }: Props = $props();

  const initials = $derived(nameInitials(name));
  const background = $derived(nameColor(name));
</script>

<span
  class="avatar"
  style:width={`${size}px`}
  style:height={`${size}px`}
  style:background={background}
  style:font-size={`${Math.round(size * 0.4)}px`}
  role="img"
  aria-label={name}
  title={name}
>
  {initials}
</span>

<style>
  .avatar {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: white;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    user-select: none;
  }
</style>
