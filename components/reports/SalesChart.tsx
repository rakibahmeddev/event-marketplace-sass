import { formatMoney, formatMoneyCompact } from '@/lib/format/money';
import { labelIndexes, yAxis } from '@/lib/reports/chart';
import { cn } from '@/lib/utils/cn';

export type ChartDay = { date: string; amount: number; tickets: number };

const dayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const label = (date: string) => dayLabel.format(new Date(`${date}T00:00:00Z`));

/**
 * Daily bar chart (design 09 "Ticket sales"), plain HTML/CSS — no chart library. The last 7 days are
 * solid, older days faded, the best day coral. Screen readers get the same numbers as a table.
 */
export function SalesChart({
  days,
  currency,
  caption,
}: {
  days: ChartDay[];
  currency: string;
  caption: string;
}) {
  const max = Math.max(0, ...days.map((d) => d.amount));
  const { top, ticks } = yAxis(max);
  const best = max > 0 ? days.findIndex((d) => d.amount === max) : -1;
  const xLabels = new Set(labelIndexes(days.length));

  return (
    <figure className="m-0 flex flex-1 flex-col">
      {/* Grows with its card (min 220px), so side-by-side panels line up. */}
      <div aria-hidden className="flex min-h-[220px] flex-1 gap-2.5">
        <div className="flex flex-col justify-between pb-[22px] text-right text-[11px] text-slate-500">
          {ticks.map((t) => (
            <span key={t}>{formatMoneyCompact(t, currency)}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="relative flex flex-1 items-end gap-[3px] border-b border-line-soft md:gap-[5px]">
            {ticks.slice(0, -1).map((t, i) => (
              <span
                key={t}
                className="pointer-events-none absolute inset-x-0 border-t border-line-soft/70"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
            {days.map((d, i) => (
              <span
                key={d.date}
                title={`${label(d.date)}: ${formatMoney(d.amount, currency)} · ${d.tickets} ticket${d.tickets === 1 ? '' : 's'}`}
                className={cn(
                  'relative min-w-0 flex-1 rounded-t-[4px]',
                  i === best ? 'bg-accent' : 'bg-primary',
                  i < days.length - 7 && i !== best && 'opacity-55',
                )}
                style={{
                  height: `${top > 0 ? Math.max(d.amount > 0 ? 1.5 : 0, (d.amount / top) * 100) : 0}%`,
                }}
              />
            ))}
          </div>
          <div className="relative h-4 text-[11px] text-slate-500">
            {days.map((d, i) =>
              xLabels.has(i) ? (
                <span
                  key={d.date}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${((i + 0.5) / days.length) * 100}%`,
                    transform:
                      i === 0
                        ? 'translateX(-25%)'
                        : i === days.length - 1
                          ? 'translateX(-75%)'
                          : 'translateX(-50%)',
                  }}
                >
                  {label(d.date)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Sales</th>
            <th scope="col">Tickets</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{label(d.date)}</th>
              <td>{formatMoney(d.amount, currency)}</td>
              <td>{d.tickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
