"use client";

import { useEffect, useState } from "react";

type BusinessHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type Props = {
  hours: BusinessHour[];
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getMondayBasedDay(date: Date) {
  return (date.getDay() + 6) % 7;
}

function formatTime(time: string | null) {
  if (!time) return "Not specified";

  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "Not specified";
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getOpeningStatus(
  hours: BusinessHour[],
  now: Date,
): { isOpen: boolean; message: string } {
  const currentDay = getMondayBasedDay(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const today = hours.find(
    (item) => item.day_of_week === currentDay,
  );

  // Check whether yesterday's overnight hours are still active.
  const previousDay = (currentDay + 6) % 7;
  const yesterday = hours.find(
    (item) => item.day_of_week === previousDay,
  );

  if (
    yesterday &&
    !yesterday.is_closed &&
    yesterday.opens_at &&
    yesterday.closes_at
  ) {
    const previousOpening = getMinutes(yesterday.opens_at);
    const previousClosing = getMinutes(yesterday.closes_at);

    if (
      previousClosing < previousOpening &&
      currentMinutes < previousClosing
    ) {
      return { isOpen: true, message: "Open now" };
    }
  }

  if (
    !today ||
    today.is_closed ||
    !today.opens_at ||
    !today.closes_at
  ) {
    return { isOpen: false, message: "Closed now" };
  }

  const opening = getMinutes(today.opens_at);
  const closing = getMinutes(today.closes_at);

  let isOpen = false;

  if (closing > opening) {
    isOpen =
      currentMinutes >= opening && currentMinutes < closing;
  } else if (closing < opening) {
    isOpen =
      currentMinutes >= opening || currentMinutes < closing;
  }

  if (isOpen) {
    return { isOpen: true, message: "Open now" };
  }

  if (currentMinutes < opening) {
    return {
      isOpen: false,
      message: `Opens at ${formatTime(today.opens_at)}`,
    };
  }

  return { isOpen: false, message: "Closed now" };
}

export default function BusinessHoursDisplay({ hours }: Props) {
  // Start with null to avoid server/client rendering mismatches.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const status = now ? getOpeningStatus(hours, now) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Opening hours</h2>

        {status && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              status.isOpen
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status.message}
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {DAYS.map((day, index) => {
          const dayHours = hours.find(
            (item) => item.day_of_week === index,
          );

          const isToday =
            now !== null &&
            getMondayBasedDay(now) === index;

          let schedule = "Hours not specified";

          if (dayHours?.is_closed) {
            schedule = "Closed";
          } else if (
            dayHours?.opens_at &&
            dayHours?.closes_at
          ) {
            schedule = `${formatTime(
              dayHours.opens_at,
            )} – ${formatTime(dayHours.closes_at)}`;
          }

          return (
            <div
              key={day}
              className={`flex items-center justify-between gap-4 py-4 ${
                isToday ? "rounded-lg bg-slate-50 px-3" : ""
              }`}
            >
              <span
                className={`text-sm ${
                  isToday
                    ? "font-bold text-slate-900"
                    : "font-medium text-slate-700"
                }`}
              >
                {day}

                {isToday && (
                  <span className="ml-2 text-xs text-slate-500">
                    Today
                  </span>
                )}
              </span>

              <span
                className={`text-right text-sm ${
                  dayHours?.is_closed
                    ? "text-red-600"
                    : "text-slate-600"
                }`}
              >
                {schedule}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}