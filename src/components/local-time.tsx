"use client";

/** Renders a timestamp in the viewer's timezone (the server's timezone is usually UTC). */
export function LocalTime({ date, full }: { date: Date | string; full?: boolean }) {
  const d = new Date(date);
  const text = full
    ? d.toLocaleString("en-GB")
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <time dateTime={d.toISOString()} suppressHydrationWarning>
      {text}
    </time>
  );
}
