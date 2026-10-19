"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ReviewFormProps = {
  businessId: string;
};

export default function ReviewForm({ businessId }: ReviewFormProps) {
  const router = useRouter();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        router.refresh();
        return;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          rating,
          comment: comment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to submit your review.");
        return;
      }

      setMessage(
        result.message ||
          "Your review has been submitted and is awaiting approval."
      );
      setRating(5);
      setComment("");
      router.refresh();
    } catch (err) {
      console.error("Review submission error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">
        Write a review
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Share your experience to help other customers discover great local
        businesses.
      </p>

      <form onSubmit={submitReview} className="mt-6 space-y-5">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-700">
            Your rating
          </legend>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const activeStar = hoverRating || rating;

              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={rating === star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="rounded p-1 text-3xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <span
                    className={
                      star <= activeStar
                        ? "text-amber-400"
                        : "text-slate-300"
                    }
                  >
                    ★
                  </span>
                </button>
              );
            })}

            <span className="ml-2 text-sm text-slate-600">
              {rating} out of 5
            </span>
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="review-comment"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Your review
          </label>

          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="What did you like about this business?"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />

          <p className="mt-1 text-right text-xs text-slate-500">
            {comment.length}/2000 characters
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Submitting..." : "Submit review"}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          Your review will be visible publicly after it has been approved.
        </p>
      </form>
    </section>
  );
}