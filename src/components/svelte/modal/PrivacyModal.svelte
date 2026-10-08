<script lang="ts">
  import ModalHeader from "./ModalHeader.svelte";
  import { DISCORD_URL, MESSENGER_CONTRIBUTE_TARGET } from "@constants/community-links";
</script>

<section class="privacy-modal">
  <ModalHeader
    title="Privacy Policy"
    description="Last updated: June 29, 2026."
  />

  <div class="privacy-modal__scroll map-chrome-scroll">
    <p>
      Room TBA is a free UPLB campus map and schedule finder maintained by
      volunteers. It is not an official University of the Philippines Los Baños
      website.
    </p>

    <section>
      <h3>Information we process</h3>
      <ul>
        <li>Vercel Analytics for public-site traffic patterns.</li>
        <li>Browser storage for cached campus data and app preferences.</li>
        <li>Optional device location, used locally and not stored as a GPS track.</li>
        <li>
          Contributor account details, edit proposals, and session cookies when
          you sign in.
        </li>
      </ul>
    </section>

    <section>
      <h3>Your choices</h3>
      <p>
        Clear site data in your browser to remove local caches, and sign out on
        shared devices. Account settings let signed-in contributors manage their
        details or delete their account; published edit history stays attributed
        to a deleted user so the audit trail remains intact.
      </p>
    </section>

    <section>
      <h3>What we do not sell</h3>
      <p>We do not sell personal information or run third-party ad networks.</p>
    </section>

    <p>
      Questions? Contact the team on
      <a href={MESSENGER_CONTRIBUTE_TARGET} target="_blank" rel="noopener noreferrer">Messenger</a>
      or <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>.
    </p>
    <a class="privacy-modal__full-link" href="/privacy">View full policy</a>
  </div>
</section>

<style>
  .privacy-modal {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
  }

  h3,
  p,
  ul {
    margin: 0;
  }

  .privacy-modal__scroll {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 0.875rem;
    overflow-y: auto;
    padding: 0 1rem 0.5rem;
    color: var(--theme-text, hsl(0 0% 22%));
    font-size: 0.875rem;
    line-height: 1.55;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h3 {
    color: var(--theme-accent-text, hsl(5 53% 28%));
    font-size: 0.875rem;
  }

  ul {
    padding-left: 1.125rem;
  }

  li + li {
    margin-top: 0.25rem;
  }

  a {
    color: var(--theme-accent-text, hsl(5 53% 32%));
    font-weight: 600;
  }

  .privacy-modal__full-link {
    align-self: flex-start;
  }
</style>
