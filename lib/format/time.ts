/**
 * Timezone helpers built on Intl (no dependency). Events store UTC instants plus an
 * IANA timezone; organizers enter wall-clock times in the event's timezone.
 */

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsInZone(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: +p.year!,
    month: +p.month!,
    day: +p.day!,
    hour: +p.hour!,
    minute: +p.minute!,
    second: +p.second!,
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(date.getTime() / 1000) * 1000
  );
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "2026-10-03" + "20:00" in "America/New_York" → the UTC instant. Returns null for invalid input. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t || !isValidTimeZone(timeZone)) return null;
  const [y, mo, da, h, mi] = [+d[1]!, +d[2]!, +d[3]!, +t[1]!, +t[2]!];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  const asUtc = Date.UTC(y, mo - 1, da, h, mi);
  // Two passes handle DST transitions.
  let guess = asUtc - offsetMs(new Date(asUtc), timeZone);
  guess = asUtc - offsetMs(new Date(guess), timeZone);
  const check = partsInZone(new Date(guess), timeZone);
  if (check.day !== da || check.month !== mo) return null; // e.g. 31 Feb
  return new Date(guess);
}

/** UTC instant → { date: "YYYY-MM-DD", time: "HH:mm" } in the zone (for form defaults). */
export function utcToZonedInput(instant: Date, timeZone: string): { date: string; time: string } {
  const p = partsInZone(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** Start of the calendar day containing `instant`, in the zone, plus `days`. */
export function startOfZonedDay(instant: Date, timeZone: string, days = 0): Date {
  const p = partsInZone(instant, timeZone);
  const base = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  const iso = base.toISOString().slice(0, 10);
  return zonedToUtc(iso, '00:00', timeZone)!;
}

export type DateRangeKey = 'today' | 'tomorrow' | 'weekend';

/** [from, to) for the browse filters, computed in the marketplace's timezone. */
export function dateRange(key: DateRangeKey, now: Date, timeZone: string): { from: Date; to: Date } {
  if (key === 'today') return { from: now, to: startOfZonedDay(now, timeZone, 1) };
  if (key === 'tomorrow')
    return { from: startOfZonedDay(now, timeZone, 1), to: startOfZonedDay(now, timeZone, 2) };
  // Weekend = Friday 18:00 → Monday 00:00. If it's already the weekend, from = now.
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const daysToMonday = (8 - dow) % 7 || 7;
  const to = startOfZonedDay(now, timeZone, daysToMonday);
  const fridayStart = startOfZonedDay(now, timeZone, daysToMonday - 3);
  const fridayEvening = new Date(fridayStart.getTime() + 18 * 3600_000);
  return { from: now > fridayEvening ? now : fridayEvening, to };
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = timeZone + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) fmtCache.set(key, (f = new Intl.DateTimeFormat('en-US', { timeZone, ...opts })));
  return f;
}

/** Card/meta strings like the design: "Sat, Oct 3 · 8:00 PM", badge "OCT" / "03". */
export function eventDateLabels(start: Date, end: Date, timeZone: string) {
  const sameDay = utcToZonedInput(start, timeZone).date === utcToZonedInput(end, timeZone).date;
  const time = fmt(timeZone, { hour: 'numeric', minute: '2-digit' }).format(start);
  const short = sameDay
    ? `${fmt(timeZone, { weekday: 'short', month: 'short', day: 'numeric' }).format(start)} · ${time}`
    : `${fmt(timeZone, { month: 'short', day: 'numeric' }).formatRange(start, end)} · ${time}`;
  return {
    month: fmt(timeZone, { month: 'short' }).format(start).toUpperCase(),
    day: fmt(timeZone, { day: '2-digit' }).format(start),
    short,
    long: fmt(timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start),
    timeRange: `${time} – ${fmt(timeZone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(end)}`,
  };
}
