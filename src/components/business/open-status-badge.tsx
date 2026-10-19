"use client";

import { useEffect, useState } from "react";

type BusinessHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type OpenStatusBadgeProps = {
  hours: BusinessHour[];
};

type Status = {
  label: string;
  detail: string;
  isOpen: boolean;
};

const TIME_ZONE = "Africa/Addis_Ababa";

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getMinutes(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function getCurrentTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const day = WEEKDAYS[values.weekday];

  if (day === undefined) return null;

  return {
    day,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function findNextOpening(
  hours: BusinessHour[],
  currentDay: number,
  currentMinutes: number,
): string {
  for (let offset = 0; offset < 7; offset++) {
    const day = (currentDay + offset) % 7;

    const schedule = hours.find((item) => item.day_of_week === day);

    if (
      !schedule ||
      schedule.is_closed ||
      !schedule.opens_at ||
      !schedule.closes_at
    ) {
      continue;
    }

    const opens = getMinutes(schedule.opens_at);
    const closes = getMinutes(schedule.closes_at);

    if (opens === null || closes === null || opens === closes) {
      continue;
    }

    if (offset === 0 && opens <= currentMinutes) {
      continue;
    }

    const dayLabel =
      offset === 0
        ? "today"
        : offset === 1
          ? "tomorrow"
          : DAY_NAMES[day];

    return `Opens ${dayLabel} at ${formatTime(opens)}`;
  }

  return "Opening hours unavailable";
}

function calculateStatus(hours: BusinessHour[]): Status {
  const current = getCurrentTime();

  if (!current) {
    return {
      label: "Hours unavailable",
      detail: "Unable to determine current hours",
      isOpen: false,
    };
  }

  const today = hours.find(
    (item) => item.day_of_week === current.day,
  );

  const previousDay = (current.day + 6) % 7;

  const previous = hours.find(
    (item) => item.day_of_week === previousDay,
  );

  // Check whether yesterday's opening hours continue after midnight.
  if (
    previous &&
    !previous.is_closed &&
    previous.opens_at &&
    previous.closes_at
  ) {
    const previousOpen = getMinutes(previous.opens_at);
    const previousClose = getMinutes(previous.closes_at);

    if (
      previousOpen !== null &&
      previousClose !== null &&
      previousClose < previousOpen &&
      current.minutes < previousClose
    ) {
      return {
        label: "Open Now",
        detail: `Closes at ${formatTime(previousClose)}`,
        isOpen: true,
      };
    }
  }

  if (!today || today.is_closed || !today.opens_at || !today.closes_at) {
    return {
      label: "Closed Now",
      detail: findNextOpening(hours, current.day, current.minutes),
      isOpen: false,
    };
  }

  const opens = getMinutes(today.opens_at);
  const closes = getMinutes(today.closes_at);

  if (opens === null || closes === null || opens === closes) {
    return {
      label: "Hours unavailable",
      detail: "Please check with the business",
      isOpen: false,
    };
  }

  const isOpen =
    closes > opens
      ? current.minutes >= opens && current.minutes < closes
      : current.minutes >= opens || current.minutes < closes;

  if (isOpen) {
    return {
      label: "Open Now",
      detail: `Closes at ${formatTime(closes)}`,
      isOpen: true,
    };
  }

  return {
    label: "Closed Now",
    detail: findNextOpening(hours, current.day, current.minutes),
    isOpen: false,
  };
}

export default function OpenStatusBadge({
  hours,
}: OpenStatusBadgeProps) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(calculateStatus(hours));
    };

    updateStatus();

    const interval = window.setInterval(updateStatus, 60_000);

    return () => window.clearInterval(interval);
  }, [hours]);

  if (!status) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
          Checking hours...
        </span>
      </div>
    );
  }

  const badgeClass = status.isOpen
    ? "bg-green-100 text-green-800 ring-green-200"
    : status.label === "Hours unavailable"
      ? "bg-gray-100 text-gray-700 ring-gray-200"
      : "bg-red-100 text-red-800 ring-red-200";

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${badgeClass}`}
        aria-live="polite"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            status.isOpen ? "bg-green-600" : "bg-red-600"
          }`}
        />

        {status.label}
      </span>

      <p className="text-sm text-gray-600">{status.detail}</p>
    </div>
  );
}
