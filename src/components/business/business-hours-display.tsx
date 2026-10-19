type BusinessHour = {
  id?: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type BusinessHoursDisplayProps = {
  hours: BusinessHour[];
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function formatTime(value: string | null): string {
  if (!value) return "Not set";

  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = minuteString ?? "00";

  if (!Number.isFinite(hour)) return value;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

export default function BusinessHoursDisplay({
  hours,
}: BusinessHoursDisplayProps) {
  const hoursByDay = new Map(
    hours.map((hour) => [hour.day_of_week, hour]),
  );

  return (
    <section
      aria-labelledby="business-hours-heading"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
          🕒
        </div>

        <div>
          <h2
            id="business-hours-heading"
            className="text-lg font-bold text-gray-950"
          >
            Opening hours
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Find out when we are open.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {DAYS.map((day) => {
          const schedule = hoursByDay.get(day.value);

          let timeLabel = "Hours not available";

          if (schedule?.is_closed) {
            timeLabel = "Closed";
          } else if (schedule?.opens_at && schedule?.closes_at) {
            timeLabel = `${formatTime(schedule.opens_at)} – ${formatTime(
              schedule.closes_at,
            )}`;
          }

          return (
            <div
              key={day.value}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="text-sm font-medium text-gray-700">
                {day.label}
              </span>

              <span
                className={`text-right text-sm ${
                  schedule?.is_closed
                    ? "font-medium text-red-600"
                    : "text-gray-600"
                }`}
              >
                {timeLabel}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
