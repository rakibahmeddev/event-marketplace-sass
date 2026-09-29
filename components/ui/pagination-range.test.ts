import { describe, expect, it } from 'vitest';
import { paginationRange } from './pagination-range';

describe('paginationRange', () => {
  it('lists every page when there are few', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('matches the design on page 1 of 28', () => {
    expect(paginationRange(1, 28)).toEqual([1, 2, 3, 4, 'ellipsis', 28]);
  });
  it('shows neighbours in the middle', () => {
    expect(paginationRange(10, 28)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 28]);
  });
  it('handles the last page', () => {
    expect(paginationRange(28, 28)).toEqual([1, 'ellipsis', 25, 26, 27, 28]);
  });
});
