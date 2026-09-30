import jsQR from 'jsqr';

/**
 * Decodes a QR code from RGBA pixels (camera frame drawn on a canvas). Pure — unit-testable.
 * The scanner uses the browser's BarcodeDetector when available and falls back to this (iPhone Safari).
 */
export function decodeQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  const code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
  return code?.data || null;
}
