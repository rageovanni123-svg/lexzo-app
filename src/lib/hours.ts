import type { Hours } from "@/data/restaurants";

/** Returns true if the restaurant is currently open based on its hours config. */
export function isOpenNow(hours: Hours | undefined): boolean | null {
  if (!hours) return null;

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  const schedule = isWeekend && hours.weekends ? hours.weekends : hours.weekdays;

  const [openStr, closeStr] = schedule.split("–");
  if (!openStr || !closeStr) return null;

  const toMinutes = (t: string) => {
    const [h, m] = t.trim().split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(openStr);
  let closeMinutes = toMinutes(closeStr);

  // Handle closing after midnight (e.g. 23:00 – 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/** Returns the current schedule string for the restaurant. */
export function getTodayHours(hours: Hours | undefined): string | null {
  if (!hours) return null;
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend && hours.weekends ? hours.weekends : hours.weekdays;
}
