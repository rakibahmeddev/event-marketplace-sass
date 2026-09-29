import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { authErrorMessage } from './client';

describe('authErrorMessage', () => {
  it('does not reveal whether an account exists', () => {
    for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
      expect(authErrorMessage(new FirebaseError(code, 'x'))).toBe('Email or password is incorrect.');
    }
  });
  it('explains blocking-function rejections (production and emulator formats)', () => {
    const prod = new FirebaseError(
      'auth/internal-error',
      'Firebase: BLOCKING_FUNCTION_ERROR_RESPONSE : ((...))',
    );
    const emu = new FirebaseError('auth/internal-error', 'HTTP error 403: {"status":"PERMISSION_DENIED"}');
    expect(authErrorMessage(prod)).toBe('This marketplace is not accepting sign-ups right now.');
    expect(authErrorMessage(emu)).toBe('This marketplace is not accepting sign-ups right now.');
  });
  it('does not blame the marketplace for unrelated internal errors', () => {
    expect(authErrorMessage(new FirebaseError('auth/internal-error', 'script blocked'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
