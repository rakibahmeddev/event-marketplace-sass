/** Minimal RFC 5545 calendar file for "Add to calendar". */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (m) => `\\${m}`);
}
function stamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function eventIcs(e: {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  url: string;
  description: string;
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//event-ticketing//EN',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `URL:${e.url}`,
    `DESCRIPTION:${esc(e.description.slice(0, 500))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
