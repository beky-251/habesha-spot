"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError("");

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        setUser(null);
        router.replace(
          "/login?redirectTo=%2Fdashboard%2Fsettings",
        );
        return;
      }

      const {
        data: profile,
        error: profileLoadError,
      } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .maybeSingle();

      setUser(currentUser);

      const metadataName =
        typeof currentUser.user_metadata?.full_name === "string"
          ? currentUser.user_metadata.full_name
          : "";

      if (profileLoadError) {
        console.error(
          "Unable to load profile:",
          profileLoadError.message,
        );

        setFullName(metadataName);
        setProfileError(
          "Your account loaded, but your saved profile could not be retrieved.",
        );
        return;
      }

      setFullName(profile?.full_name ?? metadataName);
    } catch (error: unknown) {
      console.error("Unable to load account settings:", error);

      setUser(null);
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to load your account settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProfile]);

  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user) {
      router.replace(
        "/login?redirectTo=%2Fdashboard%2Fsettings",
      );
      return;
    }

    const normalizedName = fullName.trim();

    setProfileError("");
    setProfileMessage("");

    if (normalizedName.length < 2) {
      setProfileError(
        "Your name must contain at least 2 characters.",
      );
      return;
    }

    if (normalizedName.length > 100) {
      setProfileError(
        "Your name cannot exceed 100 characters.",
      );
      return;
    }

    setSavingProfile(true);

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        router.replace(
          "/login?redirectTo=%2Fdashboard%2Fsettings",
        );
        setProfileError(
          "Your session has expired. Please sign in again.",
        );
        return;
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            full_name: normalizedName,
          },
        });

      if (metadataError) {
        throw metadataError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          full_name: normalizedName,
        })
        .eq("id", currentUser.id);

      if (profileUpdateError) {
        setProfileError(
          "Your account name was updated, but your profile table could not be updated. Please check your profiles table and its RLS policies.",
        );
        return;
      }

      setFullName(normalizedName);
      setUser(currentUser);
      setProfileMessage(
        "Your profile has been updated successfully.",
      );

      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to save profile:", error);

      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to save your profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (!user?.email) {
      setPasswordError(
        "Your account email could not be found. Please sign in again.",
      );
      return;
    }

    if (!currentPassword) {
      setPasswordError(
        "Please enter your current password.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "The new passwords do not match.",
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password.",
      );
      return;
    }

    setChangingPassword(true);

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        router.replace(
          "/login?redirectTo=%2Fdashboard%2Fsettings",
        );
        setPasswordError(
          "Your session has expired. Please sign in again.",
        );
        return;
      }

      if (!currentUser.email) {
        setPasswordError(
          "Your account email could not be found.",
        );
        return;
      }

      // Verify the current password before updating it.
      const { error: verifyError } =
        await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword,
        });

      if (verifyError) {
        setPasswordError(
          "Your current password is incorrect.",
        );
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        "Your password has been changed successfully.",
      );
    } catch (error: unknown) {
      console.error("Failed to change password:", error);

      setPasswordError(
        error instanceof Error
          ? error.message
          : "Unable to change your password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
          <p className="mt-4 text-sm text-slate-600">
            Loading your account settings...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-950">
            Sign in required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to manage your personal information and
            account security.
          </p>

          {profileError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {profileError}
            </p>
          )}

          <Link
            href="/login?redirectTo=%2Fdashboard%2Fsettings"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const avatarLetter = (
    fullName.trim() ||
    user.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-600 transition hover:text-orange-600"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-5">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600">
              Your account
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Account settings
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manage your personal information and keep your
              account secure.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                {avatarLetter}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {fullName || "Your account"}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            <nav
              className="mt-6 space-y-1"
              aria-label="Settings navigation"
            >
              <a
                href="#profile"
                className="block rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-700"
              >
                Personal information
              </a>

              <a
                href="#security"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Password & security
              </a>
            </nav>
          </aside>

          <div className="space-y-6">
            <section
              id="profile"
              className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-950">
                  Personal information
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Update the name associated with your account.
                </p>
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full name
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      setProfileError("");
                      setProfileMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={user.email ?? ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Your email address cannot be changed from this
                    page.
                  </p>
                </div>

                {profileError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  >
                    {profileError}
                  </div>
                )}

                {profileMessage && (
                  <div
                    role="status"
                    className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
                  >
                    {profileMessage}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile
                      ? "Saving changes..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            </section>

            <section
              id="security"
              className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-950">
                  Password & security
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Use a strong password that you do not use on other
                  websites.
                </p>
              </div>

              <form
                onSubmit={handleChangePassword}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Current password
                  </label>

                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    New password
                  </label>

                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Use at least 8 characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm new password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                {passwordError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  >
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div
                    role="status"
                    className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
                  >
                    {passwordMessage}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {changingPassword
                      ? "Updating password..."
                      : "Change password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <footer className="py-8 text-center text-xs text-slate-500">
          HabeshaSpot · Discover. Eat. Explore.
        </footer>
      </div>
    </main>
  );
}