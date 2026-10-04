const idrFormatter = new Intl.NumberFormat("id-ID");

/** "12000" -> "Rp 12.000" */
export function formatRupiah(value: number): string {
  return `Rp ${idrFormatter.format(Math.round(value))}`;
}

/** "12000" -> "Rp12.000" (compact, no space — used inside dense cards) */
export function formatRupiahCompact(value: number): string {
  return `Rp${idrFormatter.format(Math.round(value))}`;
}

export function formatNumber(value: number): string {
  return idrFormatter.format(Math.round(value));
}

/** "450000" -> "450k" for chart axes. */
export function formatShortRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatLongDate(value: string | Date): string {
  return longDateFormatter.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} • ${formatTime(value)}`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 18) return "Good evening";
  return "Good night";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (!parts[0]) return "?";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

/** Start of the current day in the server's local time zone. */
export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfWeek(): Date {
  const date = startOfToday();
  date.setDate(date.getDate() - 6);
  return date;
}

export function startOfMonth(): Date {
  const date = startOfToday();
  date.setDate(1);
  return date;
}
