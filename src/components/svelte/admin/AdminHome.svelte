<script lang="ts">
  import { onMount } from "svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import AdminAuditLog from "@ui/admin/AdminAuditLog.svelte";
  import "../editor/entity-editor.css";

  type Role = "admin" | "editor" | "contributor";
  type Viewer = { username: string; displayName: string; role: Role } | null;

  type Dashboard = {
    pendingReviews: number | null;
    recentActivity: {
      id: number;
      entityType: string;
      action: string;
      editedBy: string;
      summary: string | null;
      createdAt: string;
    }[];
    digest: {
      lastRuns: {
        period: string;
        status: string;
        detail: Record<string, unknown> | null;
        finishedAt: string | null;
      }[];
      recipientCount: number | null;
      youReceiveIt: boolean | null;
    };
    email: {
      sent7d: number;
      failed7d: number;
      recentFailures: {
        id: number;
        toAddress: string;
        template: string;
        error: string | null;
        createdAt: string;
      }[];
    } | null;
    outbox: { pending: number; dead: number } | null;
    mfa: {
      available: boolean;
      enabled: boolean;
      required: boolean;
      graceUntil: string | null;
    } | null;
    accessRequests:
      | {
          id: number;
          username: string;
          displayName: string;
          message: string;
          createdAt: string;
        }[]
      | null;
  };

  type MyRequest = {
    id: number;
    status: "pending" | "approved" | "declined";
    message: string;
    createdAt: string;
  } | null;

  let { viewer }: { viewer: Viewer } = $props();

  const isStaff = $derived(viewer?.role === "admin" || viewer?.role === "editor");
  const isAdmin = $derived(viewer?.role === "admin");

  let dashboard = $state<Dashboard | null>(null);
  let dashboardError = $state<string | null>(null);
  let myRequest = $state<MyRequest>(null);
  let requestLoaded = $state(false);
  let requestMessage = $state("");
  let requestSending = $state(false);
  let requestError = $state<string | null>(null);
  let decidingId = $state<number | null>(null);
  let accessError = $state<string | null>(null);

  function when(value: string | null): string {
    if (!value) return "";
    const date = new Date(`${value.replace(" ", "T")}${/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? "" : "Z"}`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  }

  async function loadDashboard() {
    dashboardError = null;
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        dashboardError = "Could not load the dashboard.";
        return;
      }
      dashboard = (await res.json()) as Dashboard;
    } catch {
      dashboardError = "Network error loading the dashboard.";
    }
  }

  async function loadMyRequest() {
    try {
      const res = await fetch("/api/account/access-request", {
        credentials: "same-origin",
      });
      if (res.ok) {
        myRequest = ((await res.json()) as { request: MyRequest }).request;
      }
    } finally {
      requestLoaded = true;
    }
  }

  async function sendRequest() {
    requestSending = true;
    requestError = null;
    try {
      const res = await fetch("/api/account/access-request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: requestMessage }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: MyRequest;
      };
      if (!res.ok) {
        requestError = data.error ?? "Could not send the request.";
        return;
      }
      myRequest = data.request ?? null;
      requestMessage = "";
    } catch {
      requestError = "Network error. Try again.";
    } finally {
      requestSending = false;
    }
  }

  async function decide(id: number, decision: "approved" | "declined") {
    decidingId = id;
    accessError = null;
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        accessError = data.error ?? "Could not update the request.";
        return;
      }
      await loadDashboard();
    } catch {
      accessError = "Network error. Try again.";
    } finally {
      decidingId = null;
    }
  }

  onMount(() => {
    if (isStaff) void loadDashboard();
    else if (viewer) void loadMyRequest();
  });

  const lastDigest = $derived(dashboard?.digest.lastRuns[0] ?? null);
</script>

{#snippet rolesExplainer()}
  <SettingsSection
    title="Who can do what"
    description="Everyone can suggest edits. Roles decide what happens next."
  >
    <dl class="roles">
      <div>
        <dt>Contributor</dt>
        <dd>
          Suggests edits to rooms, buildings, and events. An editor reviews
          each suggestion before it goes live, and you get credit for it.
        </dd>
      </div>
      <div>
        <dt>Editor</dt>
        <dd>
          Publishes edits directly and reviews contributors' suggestions.
        </dd>
      </div>
      <div>
        <dt>Admin</dt>
        <dd>Everything an editor does, plus managing accounts and roles.</dd>
      </div>
    </dl>
  </SettingsSection>
{/snippet}

<div class="admin-home">
  {#if !viewer}
    <p class="admin-lead">
      Sign in to suggest edits, or to review and publish them if you are on
      the editor team.
    </p>
    {@render rolesExplainer()}
    <a class="admin-primary" href="/?editor=login">Sign in</a>
  {:else if !isStaff}
    <p class="admin-lead">
      You are signed in as <strong>{viewer.displayName}</strong>, a contributor.
    </p>
    {@render rolesExplainer()}
    <SettingsSection
      title="Request editor access"
      description="Editors publish directly and review suggestions. Tell the admins what you would like to help with."
    >
      {#if !requestLoaded}
        <p><LoadingIndicator /></p>
      {:else if myRequest?.status === "pending"}
        <EntityEditorMessage
          variant="success"
          message={`Request sent ${when(myRequest.createdAt)}. An admin will review it; you will see the new role the next time you sign in.`}
        />
      {:else}
        {#if myRequest?.status === "declined"}
          <p class="field-hint">
            Your last request was declined. You can send a new one with more
            detail.
          </p>
        {/if}
        <EntityEditorFormField
          label="What would you like to edit?"
          inputId="access-request-message"
          hint="For example: rooms in your college, org listings, or events."
        >
          {#snippet control()}
            <textarea
              id="access-request-message"
              rows="4"
              maxlength="1000"
              bind:value={requestMessage}
              disabled={requestSending}
            ></textarea>
          {/snippet}
        </EntityEditorFormField>
        {#if requestError}
          <EntityEditorMessage variant="error" message={requestError} />
        {/if}
      {/if}
      {#snippet footer()}
        {#if requestLoaded && myRequest?.status !== "pending"}
          <EntityEditorSubmitButton
            label="Send request"
            savingLabel="Sending…"
            saving={requestSending}
            disabled={requestMessage.trim().length < 10}
            onclick={sendRequest}
          />
        {/if}
      {/snippet}
    </SettingsSection>
  {:else}
    <p class="admin-lead">
      Signed in as <strong>{viewer.displayName}</strong> ({viewer.role}).
    </p>
    {#if dashboardError}
      <EntityEditorMessage variant="error" message={dashboardError} />
    {:else if !dashboard}
      <p><LoadingIndicator label="Loading dashboard…" /></p>
    {:else}
      <div class="admin-grid">
        <SettingsSection title="Review queue">
          {#snippet meta()}
            <span class="admin-stat" data-testid="pending-reviews">
              {dashboard?.pendingReviews ?? "?"}
            </span>
            suggestion{dashboard?.pendingReviews === 1 ? "" : "s"} waiting
          {/snippet}
          {#snippet children()}{/snippet}
          {#snippet footer()}
            <a class="admin-primary" href="/?review=1">Open review queue</a>
          {/snippet}
        </SettingsSection>

        {#if dashboard.mfa?.available && !dashboard.mfa.enabled}
          <SettingsSection
            title="Two-step verification"
            description={dashboard.mfa.required
              ? `Admins must turn this on${dashboard.mfa.graceUntil ? ` by ${when(dashboard.mfa.graceUntil)}` : ""}. Signing in with Google also counts.`
              : "Protect your editor account with a code from an authenticator app."}
          >
            {#snippet children()}{/snippet}
            {#snippet footer()}
              <a class="admin-primary" href="/?account=settings">Set it up</a>
            {/snippet}
          </SettingsSection>
        {/if}

        <SettingsSection
          title="Daily digest"
          description="Email to editors listing suggestions waiting for review."
        >
          {#if lastDigest}
            <p class="admin-line">
              Last run {lastDigest.period}: {lastDigest.status === "done"
                ? lastDigest.detail?.skipped
                  ? `skipped (${String(lastDigest.detail.skipped).replace("_", " ")})`
                  : `sent to ${lastDigest.detail?.recipientCount ?? 0}${lastDigest.detail?.failedCount ? `, ${lastDigest.detail.failedCount} failed` : ""}`
                : lastDigest.status}
            </p>
          {:else}
            <p class="admin-line">No runs recorded yet.</p>
          {/if}
          <p class="admin-line">
            {dashboard.digest.recipientCount ?? "?"} recipient{dashboard.digest
              .recipientCount === 1
              ? ""
              : "s"}. You {dashboard.digest.youReceiveIt === false
              ? "turned it off"
              : "receive it"}.
          </p>
          {#snippet footer()}
            <a class="admin-secondary" href="/?account=settings"
              >Email preferences</a
            >
          {/snippet}
        </SettingsSection>

        <SettingsSection
          title="Email and notifications"
          description="Delivery over the last 7 days."
        >
          {#if dashboard.email}
            <p class="admin-line">
              {dashboard.email.sent7d} sent, {dashboard.email.failed7d} failed.
            </p>
            {#if dashboard.email.recentFailures.length > 0}
              <ul class="admin-list" aria-label="Recent email failures">
                {#each dashboard.email.recentFailures as failure (failure.id)}
                  <li>
                    <strong>{failure.template}</strong> to {failure.toAddress}
                    <small>{when(failure.createdAt)}: {failure.error ?? "Unknown error"}</small>
                  </li>
                {/each}
              </ul>
            {/if}
          {:else}
            <p class="admin-line">Email log unavailable.</p>
          {/if}
          {#if dashboard.outbox}
            <p class="admin-line">
              Discord queue: {dashboard.outbox.pending} waiting to retry, {dashboard
                .outbox.dead} gave up.
            </p>
          {/if}
        </SettingsSection>

        <SettingsSection title="Recent activity" description="Latest published edits.">
          {#if dashboard.recentActivity.length === 0}
            <p class="admin-line">Nothing yet.</p>
          {:else}
            <ul class="admin-list">
              {#each dashboard.recentActivity as entry (entry.id)}
                <li>
                  <strong>{entry.editedBy}</strong>
                  {entry.summary ?? `${entry.action} ${entry.entityType.replace("_", " ")}`}
                  <small>{when(entry.createdAt)}</small>
                </li>
              {/each}
            </ul>
          {/if}
        </SettingsSection>

        {#if isAdmin}
          <SettingsSection
            title="Accounts"
            description="Invite editors, change roles, and deactivate accounts."
          >
            {#if dashboard.accessRequests && dashboard.accessRequests.length > 0}
              <h4 class="admin-subhead">Editor access requests</h4>
              {#if accessError}
                <EntityEditorMessage variant="error" message={accessError} />
              {/if}
              <ul class="admin-list">
                {#each dashboard.accessRequests as request (request.id)}
                  <li class="admin-request">
                    <span>
                      <strong>{request.displayName}</strong> ({request.username})
                      <small>{when(request.createdAt)}</small>
                    </span>
                    <span class="admin-request-message">{request.message}</span>
                    <span class="admin-request-actions">
                      <button
                        type="button"
                        class="admin-secondary"
                        disabled={decidingId === request.id}
                        onclick={() => decide(request.id, "declined")}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        class="admin-primary"
                        disabled={decidingId === request.id}
                        onclick={() => decide(request.id, "approved")}
                      >
                        Make editor
                      </button>
                    </span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="admin-line">No pending editor access requests.</p>
            {/if}
            {#snippet footer()}
              <a class="admin-primary" href="/?manage=users">Manage users</a>
            {/snippet}
          </SettingsSection>
        {/if}
      </div>

      {#if isAdmin}
        <AdminAuditLog />
      {/if}
    {/if}
  {/if}
</div>

<style>
  .admin-home {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .admin-lead {
    margin: 0;
    line-height: 1.5;
  }
  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1rem;
    align-items: start;
  }
  .admin-stat {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 12%));
    margin-right: 0.25rem;
  }
  .admin-line {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
  }
  .admin-subhead {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
  .admin-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .admin-list li {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    overflow-wrap: anywhere;
  }
  .admin-list small {
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }
  .admin-request-message {
    white-space: pre-wrap;
  }
  .admin-request-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }
  .roles {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .roles dt {
    font-weight: 600;
  }
  .roles dd {
    margin: 0.125rem 0 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }
  .admin-primary,
  .admin-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0 1rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.875rem;
    text-decoration: none;
    cursor: pointer;
    align-self: flex-start;
  }
  .admin-primary {
    border: none;
    background: var(--theme-accent-fill, #7b1113);
    color: #fff;
  }
  .admin-secondary {
    border: 1px solid var(--theme-border-strong, hsl(0, 0%, 75%));
    background: none;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }
  .admin-primary:disabled,
  .admin-secondary:disabled {
    opacity: 0.38;
    cursor: default;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
</style>
