import type { Hours } from "@/data/restaurants";
import { DEFAULT_CITY } from "@/lib/site";

/** Dia da semana e minutos do dia no fuso do estabelecimento (não no relógio do aparelho). */
function nowInCity(): { day: number; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_CITY.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day: day < 0 ? new Date().getDay() : day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  } catch {
    const d = new Date();
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}

/** Returns true if the restaurant is currently open based on its hours config. */
export function isOpenNow(hours: Hours | undefined): boolean | null {
  if (!hours) return null;

  const { day, minutes: currentMinutes } = nowInCity(); // 0 = domingo, 6 = sábado
  const isWeekend = day === 0 || day === 6;
  const schedule = isWeekend && hours.weekends ? hours.weekends : hours.weekdays;

  const [openStr, closeStr] = schedule.split("–");
  if (!openStr || !closeStr) return null;

  const toMinutes = (t: string) => {
    const [h, m] = t.trim().split(":").map(Number);
    return h * 60 + (m || 0);
  };

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
  const { day } = nowInCity();
  const isWeekend = day === 0 || day === 6;
  return isWeekend && hours.weekends ? hours.weekends : hours.weekdays;
}
