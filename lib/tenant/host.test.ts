import { describe, expect, it } from 'vitest';
import { normalizeHost } from './host';

describe('normalizeHost', () => {
  it('lowercases and strips the port', () => {
    expect(normalizeHost('Demo.LocalHost:3000')).toBe('demo.localhost');
  });
  it('strips a trailing dot', () => {
    expect(normalizeHost('tickets.example.com.')).toBe('tickets.example.com');
  });
  it('keeps IPv4 hosts', () => {
    expect(normalizeHost('127.0.0.1:3000')).toBe('127.0.0.1');
  });
  it.each([
    null,
    '',
    '[::1]:3000',
    'evil.com/../tenants',
    'a b.com',
    'x'.repeat(254),
    '-bad.com',
    'tenants/t1',
  ])('rejects %s', (input) => {
    expect(normalizeHost(input)).toBeNull();
  });
});
