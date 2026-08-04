<script lang="ts">
  import {
    CONTRIBUTOR_LICENSE_CONSENT,
    DATA_LICENSE_TERMS_PATH,
  } from "@constants/data-license";
</script>

<p class="proposal-license-note">
  {CONTRIBUTOR_LICENSE_CONSENT}
  <a href={DATA_LICENSE_TERMS_PATH}>Terms</a>
</p>

<style>
  .proposal-license-note {
    flex: 1 1 100%;
    margin: 0;
    color: hsl(0, 0%, 38%);
    font-size: 0.6875rem;
    line-height: 1.35;
  }

  .proposal-license-note a {
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: none;
  }

  .proposal-license-note a:hover,
  .proposal-license-note a:focus-visible {
    text-decoration: underline;
  }
</style>
