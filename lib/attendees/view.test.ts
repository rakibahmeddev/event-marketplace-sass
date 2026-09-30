import { describe, expect, it } from 'vitest';
import type { Ticket } from '@/lib/orders/schema';
import { attendeeSummary, attendeesCsv, csvCell, filterAttendees, parseAttendeeFilter } from './view';

const t = (id: string, name: string, status: Ticket['status'], extra: Partial<Ticket> = {}): Ticket => ({
  id,
  orderId: 'o1',
  eventId: 'e1',
  ticketTypeId: 'tt',
  ticketTypeName: 'General',
  attendeeName: name,
  attendeeEmail: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
  status,
  checkedInAt: status === 'used' ? new Date('2026-10-03T19:42:00Z') : null,
  checkedInBy: null,
  ...extra,
});

const list = [
  t('AAA111', 'Jordan Lee', 'used'),
  t('BBB222', 'Sam Ortiz', 'valid'),
  t('CCC333', 'Ada Byron', 'cancelled'),
];

describe('attendees', () => {
  it('filters by status', () => {
    expect(filterAttendees(list, 'in', '').map((x) => x.id)).toEqual(['AAA111']);
    expect(filterAttendees(list, 'out', '').map((x) => x.id)).toEqual(['BBB222']);
    expect(filterAttendees(list, 'cancelled', '').map((x) => x.id)).toEqual(['CCC333']);
    expect(filterAttendees(list, 'all', '')).toHaveLength(3);
  });

  it('searches name, email and ticket id case-insensitively', () => {
    expect(filterAttendees(list, 'all', 'sam').map((x) => x.id)).toEqual(['BBB222']);
    expect(filterAttendees(list, 'all', 'ADA.BYRON@').map((x) => x.id)).toEqual(['CCC333']);
    expect(filterAttendees(list, 'all', 'aaa1').map((x) => x.id)).toEqual(['AAA111']);
  });

  it('ignores unknown filter values', () => {
    expect(parseAttendeeFilter('in')).toBe('in');
    expect(parseAttendeeFilter('drop table')).toBe('all');
    expect(parseAttendeeFilter(undefined)).toBe('all');
  });

  it('summary excludes cancelled tickets', () => {
    expect(attendeeSummary(list)).toEqual({ checkedIn: 1, notYet: 1, total: 2 });
  });

  it('neutralises spreadsheet formulas and quotes', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('-2')).toBe(`"'-2"`);
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
    expect(csvCell('Jordan Lee')).toBe('"Jordan Lee"');
  });

  it('builds a CSV with a header row', () => {
    const csv = attendeesCsv([t('AAA111', '=cmd', 'used')], () => '8:42 PM');
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe('"Attendee","Email","Ticket type","Ticket ID","Order","Status","Checked in at"');
    expect(lines[1]).toContain(`"'=cmd"`);
    expect(lines[1]).toContain('"checked in","8:42 PM"');
  });
});
