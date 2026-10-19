"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function DashboardSettingsPage() {
  const router = useRouter();

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

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          if (active) router.replace("/login?redirectTo=/dashboard/settings");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!active) return;

        setUser(currentUser);

        if (profileError) {
          console.error("Unable to load profile:", profileError.message);
          setFullName(
            typeof currentUser.user_metadata?.full_name === "string"
              ? currentUser.user_metadata.full_name
              : ""
          );
        } else {
          setFullName(
            profile?.full_name ??
              (typeof currentUser.user_metadata?.full_name === "string"
                ? currentUser.user_metadata.full_name
                : "")
          );
        }
      } catch (error: unknown) {
        if (active) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load your account settings."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) return;

    const normalizedName = fullName.trim();

    if (normalizedName.length < 2) {
      setProfileError("Your name must contain at least 2 characters.");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: normalizedName },
      });

      if (authError) {
        setProfileError(authError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: normalizedName })
        .eq("id", user.id);

      if (profileError) {
        setProfileError(
          `Your account metadata was updated, but your profile table could not be updated: ${profileError.message}`
        );
        return;
      }

      setFullName(normalizedName);
      setProfileMessage("Your profile has been updated successfully.");
      router.refresh();
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to save your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.email) {
      setPasswordError("Your account email could not be found.");
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    setChangingPassword(true);

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        setPasswordError("Your current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been changed successfully.");
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Unable to change your password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-gray-600">Loading your settings...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your account settings.
          </p>
          <Link
            href="/login?redirectTo=/dashboard/settings"
            className="mt-5 inline-flex rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950">
            Account settings
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Manage your personal information and account security.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                {(fullName || user.email || "U").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-950">
                  {fullName || "Your account"}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <nav className="mt-6 space-y-1" aria-label="Settings navigation">
              <a
                href="#profile"
                className="block rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-medium text-orange-700"
              >
                Personal information
              </a>
              <a
                href="#security"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Password & security
              </a>
            </nav>
          </aside>

          <div className="space-y-6">
            <section
              id="profile"
              className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-950">
                  Personal information
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Update the name associated with your account.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-gray-700"
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
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email ?? ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Your email address cannot be changed here.
                  </p>
                </div>

                {profileError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {profileError}
                  </div>
                )}

                {profileMessage && (
                  <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                  >
                    {profileMessage}
                  </div>
                )}

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Saving changes..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>

            <section
              id="security"
              className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-950">
                  Password & security
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Change your password to keep your account secure.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-2 block text-sm font-medium text-gray-700"
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
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    New password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                {passwordError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                  >
                    {passwordMessage}
                  </div>
                )}

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </main>
  );
}