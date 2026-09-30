import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { decodeQr } from './decode';

/** Renders a QR (as our ticket code generator makes it) into an RGBA buffer, like a camera frame. */
function rasterize(text: string, scale = 6, margin = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const size = (n + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  return { data, size };
}

describe('decodeQr', () => {
  it('reads a ticket payload produced by our QR generator', () => {
    const payload = 'Ab12Cd34Ef56Gh78Ij90.demo.x8m-ur56Y8AvDELG2_nT-KzQ8NiADX5XgM1Sb2tbSHI';
    const { data, size } = rasterize(payload);
    expect(decodeQr(data, size, size)).toBe(payload);
  });
  it('returns null when there is no code', () => {
    const blank = new Uint8ClampedArray(200 * 200 * 4).fill(255);
    expect(decodeQr(blank, 200, 200)).toBeNull();
  });
});
