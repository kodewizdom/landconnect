/**
 * Date and Time formatting utilities for LandConnect
 */

/**
 * Pure date arithmetic 12-hour time format with uppercase AM/PM
 * e.g., "1:33 PM", "12:05 AM", "3:46 PM"
 */
export const formatTime12Hour = (value?: string | Date): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
};

/**
 * Get local calendar key YYYY-MM-DD
 */
export function getLocalDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Dynamic WhatsApp-style date separator label:
 * - "Today" (if matching current local date)
 * - "Yesterday" (if matching yesterday's local date)
 * - "DD MMM YYYY" (e.g. "14 Nov 2026")
 */
export function formatDateSeparator(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!d || Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const todayKey = getLocalDateKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const msgKey = getLocalDateKey(d);

  if (msgKey === todayKey) return "Today";
  if (msgKey === yesterdayKey) return "Yesterday";

  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format call history date with 12-hour time:
 * - "Today, 3:49 PM"
 * - "Yesterday, 2:15 PM"
 * - "14 Nov 2026, 11:30 AM"
 */
export function formatCallDate(dateInput?: string | Date): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const timeStr = formatTime12Hour(date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}, ${timeStr}`;
}
