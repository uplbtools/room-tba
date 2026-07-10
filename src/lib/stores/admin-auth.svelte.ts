import { modalStore, plannerStore, proposalsStore } from "@lib/store.svelte";
import { dismissEphemeralOverlays } from "../overlay-stack.js";

class AdminAuthStore {
  isLoggedIn: boolean = $state(false);
  username: string | null = $state(null);
  displayName: string | null = $state(null);
  role: "admin" | "editor" | "contributor" | null = $state(null);
  canPublish: boolean = $state(false);
  canReview: boolean = $state(false);
  loading: boolean = $state(false);
  loginOpen: boolean = $state(false);
  /** Which tab the login modal opens on — "signup" from the "create account"
   * entry points, "signin" everywhere else. */
  loginInitialMode: "signin" | "signup" = $state("signin");
  /** Error code from a failed OAuth redirect (`?auth_error=`). */
  oauthError: string | null = $state(null);
  accountSettingsOpen: boolean = $state(false);
  manageUsersOpen: boolean = $state(false);
  private _hydrated = false;

  private applySession(data: {
    loggedIn?: boolean;
    admin?: boolean;
    username: string | null;
    displayName?: string | null;
    role?: "admin" | "editor" | "contributor" | null;
    canPublish?: boolean;
    canReview?: boolean;
  }) {
    this.isLoggedIn = data.loggedIn ?? data.admin ?? false;
    this.username = data.username;
    this.displayName = data.displayName ?? data.username;
    this.role = data.role ?? null;
    this.canPublish = data.canPublish ?? false;
    this.canReview = data.canReview ?? false;
    if (data.canReview) void proposalsStore.refresh();
    if (this.isLoggedIn) void plannerStore.enableAccountSync();
    else plannerStore.disableAccountSync();
  }

  hydrate = async () => {
    if (this._hydrated) return;
    this._hydrated = true;
    await this.refresh();
  };

  refresh = async () => {
    try {
      const res = await fetch("/api/admin/auth", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        loggedIn?: boolean;
        admin?: boolean;
        username: string | null;
        displayName?: string | null;
        role?: "admin" | "editor" | "contributor" | null;
        canPublish?: boolean;
        canReview?: boolean;
      };
      this.applySession(data);
    } catch {
      this.isLoggedIn = false;
      this.username = null;
      this.displayName = null;
      this.role = null;
      this.canPublish = false;
      this.canReview = false;
    }
  };

  login = async (
    username: string,
    password: string,
    turnstileToken?: string | null,
  ): Promise<string | null> => {
    this.loading = true;
    try {
      const formData = new FormData();
      formData.set("username", username.trim());
      formData.set("password", password);
      if (turnstileToken) formData.set("turnstileToken", turnstileToken);

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = await res.json().catch(
        () =>
          ({}) as {
            error?: string;
            username?: string;
            displayName?: string;
            role?: "admin" | "editor" | "contributor";
            canPublish?: boolean;
            canReview?: boolean;
          },
      );
      if (!res.ok) {
        return (
          data.error ??
          (res.status === 401
            ? "Invalid username or password"
            : res.status === 429
              ? "Too many sign-in attempts. Wait about 30 seconds and try again."
              : res.status >= 500
                ? "Sign-in failed on our side. Try again later."
                : "Could not sign in. Check your username and password.")
        );
      }
      this.applySession({
        loggedIn: true,
        username: data.username ?? username.trim().toLowerCase(),
        displayName: data.displayName,
        role: data.role ?? "editor",
        canPublish: data.canPublish,
        canReview: data.canReview,
      });
      this.loginOpen = false;
      return null;
    } catch {
      return "Network error. Try again.";
    } finally {
      this.loading = false;
    }
  };

  /** Self-signup a contributor account (attribution + username reservation).
   * Logs the new account in on success. Resolves to an error message or null. */
  signup = async (input: {
    username: string;
    password: string;
    email?: string;
    displayName?: string;
    turnstileToken?: string | null;
  }): Promise<string | null> => {
    this.loading = true;
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: input.username.trim(),
          password: input.password,
          email: input.email?.trim() || undefined,
          displayName: input.displayName?.trim() || undefined,
          turnstileToken: input.turnstileToken ?? undefined,
        }),
      });
      const data = await res.json().catch(
        () =>
          ({}) as {
            error?: string;
            username?: string;
            displayName?: string;
            role?: "admin" | "editor" | "contributor";
            canPublish?: boolean;
            canReview?: boolean;
          },
      );
      if (!res.ok) {
        return (
          data.error ??
          (res.status === 409
            ? "That username is already taken. Try another."
            : res.status === 429
              ? "Too many sign-up attempts. Wait about a minute and try again."
              : res.status >= 500
                ? "Sign-up failed on our side. Try again later."
                : "Could not create your account. Check the form and try again.")
        );
      }
      this.applySession({
        loggedIn: true,
        username: data.username ?? input.username.trim().toLowerCase(),
        displayName: data.displayName,
        role: data.role ?? "contributor",
        canPublish: data.canPublish,
        canReview: data.canReview,
      });
      this.loginOpen = false;
      return null;
    } catch {
      return "Network error. Try again.";
    } finally {
      this.loading = false;
    }
  };

  /** Start Google OAuth (#456); resolves to an error message or redirects away. */
  loginWithGoogle = async (): Promise<string | null> => {
    try {
      const [{ isSupabaseConfigured }, { createBrowserSupabaseClient }] =
        await Promise.all([
          import("@lib/supabase/env"),
          import("@lib/supabase/client"),
        ]);
      if (!isSupabaseConfigured()) {
        return "Google sign-in is not configured on this server.";
      }
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) return error.message;
      return null;
    } catch {
      return "Google sign-in failed to start. Try again.";
    }
  };

  /** Start Google OAuth to link an identity onto the *already logged-in*
   * account (Account settings → Connect Google), distinct from
   * `loginWithGoogle` which creates/logs into a new account. */
  linkGoogle = async (): Promise<string | null> => {
    try {
      const [{ isSupabaseConfigured }, { createBrowserSupabaseClient }] =
        await Promise.all([
          import("@lib/supabase/env"),
          import("@lib/supabase/client"),
        ]);
      if (!isSupabaseConfigured()) {
        return "Google sign-in is not configured on this server.";
      }
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/link-callback`,
        },
      });
      if (error) return error.message;
      return null;
    } catch {
      return "Google sign-in failed to start. Try again.";
    }
  };

  logout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch {
      // ignore — we're going to clear local state regardless.
    }
    this.isLoggedIn = false;
    this.username = null;
    this.displayName = null;
    this.role = null;
    this.canPublish = false;
    this.canReview = false;
    proposalsStore.pendingCount = 0;
    proposalsStore.proposals = [];
    plannerStore.disableAccountSync();
  };

  openLogin = (mode: "signin" | "signup" = "signin") => {
    dismissEphemeralOverlays();
    modalStore.closeModal();
    this.loginInitialMode = mode;
    this.loginOpen = true;
  };

  closeLogin = () => {
    this.loginOpen = false;
    this.oauthError = null;
  };

  openAccountSettings = () => {
    dismissEphemeralOverlays();
    modalStore.closeModal();
    this.accountSettingsOpen = true;
  };

  closeAccountSettings = () => {
    this.accountSettingsOpen = false;
  };

  openManageUsers = () => {
    dismissEphemeralOverlays();
    modalStore.closeModal();
    this.manageUsersOpen = true;
  };

  closeManageUsers = () => {
    this.manageUsersOpen = false;
  };
}

export const adminAuthStore = new AdminAuthStore();
