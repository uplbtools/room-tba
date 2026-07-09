<script lang="ts">
  // Google Calendar's mark: white page, four-colour binding strip, blue "31".
  // Drawn with shapes (no text) so it stays crisp and legible at button size.
  let { size = 16 }: { size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role="img"
  aria-hidden="true"
  focusable="false"
>
  <rect x="4" y="4" width="16" height="16" rx="2.5" fill="#fff" />
  <rect x="4" y="4" width="16" height="16" rx="2.5" fill="none" stroke="#DADCE0" stroke-width="1" />
  <!-- top binding, Google's four colours -->
  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H8v3.5H4z" fill="#4285F4" />
  <path d="M8 4h4v3.5H8z" fill="#EA4335" />
  <path d="M12 4h4v3.5h-4z" fill="#FBBC05" />
  <path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5v1H16z" fill="#34A853" />
  <!-- "31" -->
  <text
    x="12"
    y="17.4"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="8"
    font-weight="700"
    fill="#4285F4">31</text>
</svg>
