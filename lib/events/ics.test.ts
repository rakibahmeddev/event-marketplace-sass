import { describe, expect, it } from 'vitest';
import { eventIcs } from './ics';

describe('eventIcs', () => {
  it('produces a VEVENT with escaped text and UTC times', () => {
    const ics = eventIcs({
      uid: 'e1@test',
      title: 'Jazz, live; tonight',
      start: new Date('2026-10-04T00:00:00Z'),
      end: new Date('2026-10-04T03:30:00Z'),
      location: 'Harbor Hall, Brooklyn',
      url: 'https://x.test/events/jazz',
      description: 'Line 1\nLine 2',
    });
    expect(ics).toContain('DTSTART:20261004T000000Z');
    expect(ics).toContain(String.raw`SUMMARY:Jazz\, live\; tonight`);
    expect(ics).toContain(String.raw`DESCRIPTION:Line 1\nLine 2`);
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
