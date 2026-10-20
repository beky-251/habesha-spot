"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "customer" | "business_owner";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [accountType, setAccountType] =
    useState<AccountType>("customer");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              account_type: accountType,
            },
            emailRedirectTo:
              `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.session) {
        router.replace(
          accountType === "business_owner"
            ? "/dashboard/businesses"
            : "/dashboard"
        );
        router.refresh();
        return;
      }

      setSuccess(
        "Your account has been created. Check your email for a verification link before signing in."
      );
    } catch {
      setError("We couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto grid min-h-[700px] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        {/* Branding panel */}
        <section className="hidden flex-col justify-between bg-[#0B132B] p-10 text-white md:flex">
          <Link
            href="/"
            className="flex items-center gap-3 text-xl font-black"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-[#0B132B]">
              <MapPin size={24} />
            </span>
            HabeshaSpot
          </Link>

          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Join our community
            </p>

            <h1 className="text-4xl font-black leading-tight">
              Discover local favorites. Grow local businesses.
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Whether you are looking for a great place or sharing
              your own business with Ethiopia, HabeshaSpot is here
              to connect you.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            Discover local, love local.
          </p>
        </section>

        {/* Signup form */}
        <section className="p-6 sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="mt-7">
            <h2 className="text-3xl font-black text-slate-900">
              Create your account
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              First, tell us how you want to use HabeshaSpot.
            </p>
          </div>

          {/* Account type selection */}
          <div className="mt-7">
            <p className="mb-3 text-sm font-bold text-slate-700">
              I want to join as a:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={accountType === "customer"}
                onClick={() => setAccountType("customer")}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  accountType === "customer"
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    accountType === "customer"
                      ? "bg-amber-400 text-[#0B132B]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <UserRound size={21} />
                </span>

                <span className="block font-extrabold text-slate-900">
                  Customer
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Discover places and share reviews.
                </span>

                {accountType === "customer" && (
                  <CheckCircle2
                    size={18}
                    className="mt-3 text-amber-600"
                  />
                )}
              </button>

              <button
                type="button"
                aria-pressed={accountType === "business_owner"}
                onClick={() => setAccountType("business_owner")}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  accountType === "business_owner"
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    accountType === "business_owner"
                      ? "bg-amber-400 text-[#0B132B]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Building2 size={21} />
                </span>

                <span className="block font-extrabold text-slate-900">
                  Business Owner
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Register and manage your business.
                </span>

                {accountType === "business_owner" && (
                  <CheckCircle2
                    size={18}
                    className="mt-3 text-amber-600"
                  />
                )}
              </button>
            </div>
          </div>

          {accountType === "business_owner" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              After creating your account, you can continue to the
              business dashboard to register your business.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
            >
              {success}

              <div className="mt-3">
                <Link
                  href="/login"
                  className="font-bold underline"
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Full name
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-amber-500">
                <UserRound size={18} className="text-slate-400" />

                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-transparent py-3.5 text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Email address
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-amber-500">
                <Mail size={18} className="text-slate-400" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent py-3.5 text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Password
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-amber-500">
                <LockKeyhole size={18} className="text-slate-400" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent py-3.5 text-slate-900 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-slate-900 outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-extrabold text-[#0B132B] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 size={18} className="animate-spin" />
              )}

              {loading
                ? "Creating account..."
                : accountType === "customer"
                  ? "Create customer account"
                  : "Create business owner account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-amber-700 hover:text-amber-800"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}