import { Checkbox } from '@/components/ui/Choice';

export type PickableEvent = { id: string; label: string };

/** Checkbox list of the organizer's events (name="eventIds"). */
export function EventPicker({
  events,
  selected,
  idPrefix,
  describedBy,
}: {
  events: PickableEvent[];
  selected?: string[];
  idPrefix: string;
  describedBy?: string;
}) {
  return (
    <div
      role="group"
      aria-describedby={describedBy}
      className="flex max-h-56 flex-col gap-2.5 overflow-y-auto rounded-input border-[1.5px] border-line p-3"
    >
      {events.map((e) => (
        <Checkbox
          key={e.id}
          id={`${idPrefix}-${e.id}`}
          name="eventIds"
          value={e.id}
          defaultChecked={selected?.includes(e.id)}
          label={e.label}
          className="text-sm"
        />
      ))}
    </div>
  );
}
