'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  faArrowLeft,
  faBolt,
  faCheck,
  faKeyboard,
  faMagnifyingGlass,
  faQrcode,
  faRotateLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { callFunctionSignedIn } from '@/lib/firebase/callables';
import { getClientDb } from '@/lib/firebase/client';
import { ensureFirebaseUser } from '@/lib/firebase/withUser';
import { decodeQr } from '@/lib/scanner/decode';
import { cn } from '@/lib/utils/cn';

// Mirrors functions/src/checkin/decide.ts (the function's response).
type InvalidReason = 'not_a_ticket' | 'other_marketplace' | 'not_found' | 'wrong_event' | 'cancelled';
type CheckInResult =
  | { result: 'valid'; attendeeName: string; ticketTypeName: string; checkedInAt: string }
  | {
      result: 'already_used';
      attendeeName: string;
      ticketTypeName: string;
      firstCheckedInAt: string | null;
      checkedInByName: string | null;
    }
  | { result: 'invalid'; reason: InvalidReason };
type Shown = (CheckInResult | { result: 'error'; message: string }) & { ticketId: string | null };

type CameraState = 'starting' | 'on' | 'denied' | 'unavailable';

type Props = {
  authTenantId: string;
  tenantId: string;
  event: { id: string; title: string; checkedIn: number; ticketsIssued: number };
  staffLabel: string;
};

const SAME_CODE_MS = 3000;
const TICKET_ID = /^[A-Za-z0-9]{1,40}$/;

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

function time(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
}

function initials(name: string) {
  const i = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return i || '?';
}

/**
 * Design 10 · 03–06: camera scanner with live counter, then a full-screen result.
 * Decoding: the browser's BarcodeDetector when present, otherwise jsQR on canvas frames.
 * Every scan goes to the checkInTicket callable — the client never decides validity.
 */
export function ScannerApp({ authTenantId, tenantId, event, staffLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [count, setCount] = useState({ checkedIn: event.checkedIn, issued: event.ticketsIssued });
  const [shown, setShown] = useState<Shown | null>(null);
  const [manual, setManual] = useState(false);
  const [pending, setPending] = useState(false);

  // Live counter: eventStats/{eventId}, readable by assigned scanners and the owning organizer.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    ensureFirebaseUser(authTenantId)
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(
          doc(getClientDb(), `tenants/${tenantId}/eventStats/${event.id}`),
          (s) =>
            setCount({
              checkedIn: (s.get('checkedIn') as number | undefined) ?? 0,
              issued: (s.get('ticketsIssued') as number | undefined) ?? 0,
            }),
          () => {}, // keep the last known count; scanning itself still works
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [authTenantId, tenantId, event.id]);

  const submit = useCallback(
    async (input: { payload: string } | { ticketId: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setPending(true);
      const ticketId =
        'ticketId' in input
          ? input.ticketId
          : TICKET_ID.test(input.payload.split('.')[0] ?? '')
            ? input.payload.split('.')[0]!
            : null;
      let next: Shown;
      if ('payload' in input && (input.payload.length < 10 || input.payload.length > 300)) {
        next = { result: 'invalid', reason: 'not_a_ticket', ticketId: null };
      } else {
        const res = await callFunctionSignedIn<CheckInResult>(authTenantId, 'checkInTicket', {
          eventId: event.id,
          ...input,
        });
        if (res.ok) {
          next = { ...res.data, ticketId };
        } else {
          const message =
            res.code === 'functions/permission-denied'
              ? 'You’re not assigned to this event any more. Ask the organizer.'
              : res.code === 'functions/resource-exhausted'
                ? 'Too many scans in a minute. Wait a moment and try again.'
                : res.code === 'functions/unavailable' || res.code === 'functions/internal'
                  ? 'No connection. Check the network and scan again.'
                  : res.error;
          next = { result: 'error', message, ticketId };
        }
      }
      if (next.result === 'valid') setCount((c) => ({ ...c, checkedIn: c.checkedIn + 1 }));
      navigator.vibrate?.(next.result === 'valid' ? 80 : next.result === 'already_used' ? [80, 60, 80] : 300);
      setShown(next);
      setManual(false);
      setPending(false);
      busyRef.current = false;
    },
    [authTenantId, event.id],
  );

  // Camera + decode loop. Paused (no detection) while a result or the manual sheet is shown.
  const paused = !!shown || manual;
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorch({ supported: !!caps.torch, on: false });
        setCamera('on');
        tick();
      } catch (err) {
        setCamera(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    }

    async function read(video: HTMLVideoElement): Promise<string | null> {
      if (detector) {
        const codes = await detector.detect(video).catch(() => []);
        return codes[0]?.rawValue ?? null;
      }
      if (!ctx || !video.videoWidth) return null;
      // Downscale large frames: jsQR is CPU-bound and QR codes stay readable at ~640px.
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return decodeQr(img.data, img.width, img.height);
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && !pausedRef.current && !busyRef.current && video.readyState >= 2) {
        const code = await read(video);
        const last = lastRef.current;
        if (code && !(last && last.code === code && Date.now() - last.at < SAME_CODE_MS)) {
          lastRef.current = { code, at: Date.now() };
          await submit({ payload: code });
        }
      }
      timer = setTimeout(tick, 150);
    }

    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [submit]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  function scanNext() {
    setShown(null);
    lastRef.current = lastRef.current && { ...lastRef.current, at: Date.now() }; // don't re-read the same code instantly
  }

  const counter = (
    <>
      <span className="font-display text-lg font-extrabold">{count.checkedIn}</span>
      <span className="font-semibold text-slate-500">/ {count.issued} checked in</span>
    </>
  );

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col md:min-h-[812px]">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Camera preview"
        className="absolute inset-0 size-full bg-[repeating-linear-gradient(135deg,#1C1A2A_0_14px,#221F33_14px_28px)] object-cover"
      />
      <header className="relative flex items-center gap-2.5 bg-gradient-to-b from-black/60 to-transparent px-4 pt-[52px] pb-4 md:pt-5">
        <Link
          href="/scanner"
          aria-label="Back to events"
          className="grid size-11 place-items-center rounded-full bg-white/15 focus-ring"
        >
          <Icon icon={faArrowLeft} />
        </Link>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[15px]">{event.title}</b>
          <div className="truncate text-xs text-[#C9C9D6]">{staffLabel}</div>
        </div>
        {torch.supported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torch.on ? 'Turn flashlight off' : 'Turn flashlight on'}
            aria-pressed={torch.on}
            className={cn(
              'grid size-11 place-items-center rounded-full focus-ring',
              torch.on ? 'bg-white text-ink' : 'bg-white/15',
            )}
          >
            <Icon icon={faBolt} />
          </button>
        )}
      </header>

      <div
        role="status"
        aria-live="polite"
        className="relative mx-auto mt-2 flex h-11 items-center gap-2.5 rounded-full bg-white px-[18px] text-[15px] font-bold text-ink shadow-[0_8px_24px_rgba(0,0,0,.3)]"
      >
        <span className="size-2 rounded-full bg-success" />
        {counter}
      </div>

      <div className="relative mx-auto mt-16 size-[260px]" aria-hidden>
        <span className="absolute top-0 left-0 size-12 rounded-tl-[18px] border-t-[5px] border-l-[5px] border-white" />
        <span className="absolute top-0 right-0 size-12 rounded-tr-[18px] border-t-[5px] border-r-[5px] border-white" />
        <span className="absolute bottom-0 left-0 size-12 rounded-bl-[18px] border-b-[5px] border-l-[5px] border-white" />
        <span className="absolute right-0 bottom-0 size-12 rounded-br-[18px] border-r-[5px] border-b-[5px] border-white" />
        {camera === 'on' && (
          <span className="absolute top-1/2 right-4 left-4 h-[3px] rounded-[3px] bg-accent shadow-[0_0_16px_var(--color-accent)] motion-safe:animate-pulse" />
        )}
      </div>
      <p className="relative mt-6 px-6 text-center text-[15px] text-[#E6E4F0]">
        {pending
          ? 'Checking ticket…'
          : camera === 'on'
            ? 'Point the camera at the ticket QR code'
            : camera === 'starting'
              ? 'Starting camera…'
              : camera === 'denied'
                ? 'Camera access was blocked. Allow the camera in your browser settings, or enter the ticket ID.'
                : 'No camera available. Enter the ticket ID instead.'}
      </p>

      <div className="relative mt-auto flex gap-2.5 bg-gradient-to-t from-black/70 to-transparent px-5 pt-5 pb-[34px]">
        <button
          type="button"
          onClick={() => setManual(true)}
          className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-input bg-white/15 text-[15px] font-semibold hover:bg-white/25 focus-ring"
        >
          <Icon icon={faKeyboard} />
          Enter ticket ID
        </button>
        {/* Name search is deferred (docs/deferred.md). */}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-input bg-white/10 text-[15px] font-semibold text-white/50"
        >
          <Icon icon={faMagnifyingGlass} />
          Search name
        </button>
      </div>

      {shown && (
        <div className="absolute inset-0 z-20 flex">
          <ResultScreen shown={shown} eventTitle={event.title} count={count} onNext={scanNext} />
        </div>
      )}
      {manual && (
        <ManualEntry
          pending={pending}
          onCancel={() => setManual(false)}
          onSubmit={(ticketId) => submit({ ticketId })}
        />
      )}
    </div>
  );
}

function ManualEntry({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (ticketId: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  function send(e: FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (!TICKET_ID.test(id)) {
      setError('Ticket IDs are letters and numbers only, as printed under the QR code.');
      return;
    }
    onSubmit(id);
  }
  return (
    <div
      className="absolute inset-0 z-10 flex items-end bg-black/50"
      role="dialog"
      aria-modal
      aria-labelledby="manual-title"
    >
      <form
        onSubmit={send}
        className="flex w-full flex-col gap-4 rounded-t-[24px] bg-white p-6 pb-[34px] text-ink"
      >
        <div className="flex items-center justify-between">
          <h2 id="manual-title" className="font-display text-xl font-extrabold">
            Enter ticket ID
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full bg-line-soft focus-ring"
          >
            <Icon icon={faXmark} />
          </button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Ticket ID</span>
          <input
            autoFocus
            name="ticketId"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(undefined);
            }}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'manual-error' : undefined}
            className="h-[52px] rounded-input border-[1.5px] border-line-strong px-3.5 font-mono text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
          {error && (
            <span id="manual-error" className="text-sm text-danger">
              {error}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-input bg-primary text-[17px] font-semibold text-white hover:bg-primary-hover disabled:opacity-60 focus-ring"
        >
          {pending ? 'Checking…' : 'Check in'}
        </button>
      </form>
    </div>
  );
}

const INVALID_TEXT: Record<InvalidReason, (event: string) => string> = {
  not_a_ticket: () => 'This isn’t a ticket QR code from this marketplace',
  other_marketplace: () => 'This ticket is for a different marketplace',
  not_found: () => 'No ticket with this code',
  wrong_event: (event) => `This ticket isn’t for ${event}`,
  cancelled: () => 'This ticket was cancelled or refunded',
};

function ResultScreen({
  shown,
  eventTitle,
  count,
  onNext,
}: {
  shown: Shown;
  eventTitle: string;
  count: { checkedIn: number; issued: number };
  onNext: () => void;
}) {
  const view =
    shown.result === 'valid'
      ? {
          bg: 'bg-success',
          fg: 'text-success',
          icon: faCheck,
          title: 'Valid ticket',
          sub: `Welcome in! Checked in at ${time(shown.checkedInAt)}`,
          note: 'Let them in.',
        }
      : shown.result === 'already_used'
        ? {
            bg: 'bg-warning',
            fg: 'text-warning',
            icon: faRotateLeft,
            title: 'Already used',
            sub:
              [
                shown.firstCheckedInAt && `First scanned at ${time(shown.firstCheckedInAt)}`,
                shown.checkedInByName && `by ${shown.checkedInByName}`,
              ]
                .filter(Boolean)
                .join(' ') || 'This ticket was already checked in',
            note: 'Check photo ID. If this is a mistake, contact the organizer.',
          }
        : shown.result === 'invalid'
          ? {
              bg: 'bg-danger',
              fg: 'text-danger',
              icon: faXmark,
              title: 'Invalid ticket',
              sub: INVALID_TEXT[shown.reason](eventTitle),
              note: 'Do not admit.',
            }
          : {
              bg: 'bg-ink-800',
              fg: 'text-ink',
              icon: faXmark,
              title: 'Couldn’t check',
              sub: shown.message,
              note: 'Try scanning again.',
            };

  const person = shown.result === 'valid' || shown.result === 'already_used' ? shown : null;

  return (
    <div
      className="flex min-h-dvh flex-1 flex-col bg-white text-ink md:min-h-[812px]"
      data-result={shown.result}
    >
      <div className={cn('px-5 pt-[52px] pb-10 text-white md:pt-6', view.bg)}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onNext}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full bg-white/20 focus-ring"
          >
            <Icon icon={faXmark} />
          </button>
          <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-black/20 px-3.5 text-sm font-bold">
            {count.checkedIn} / {count.issued}
          </span>
        </div>
        <div className="mt-10 flex flex-col items-center gap-4 text-center" role="alert">
          <span className={cn('grid size-28 place-items-center rounded-full bg-white text-[52px]', view.fg)}>
            <Icon icon={view.icon} />
          </span>
          <h1 className="font-display text-[34px] leading-10 font-extrabold">{view.title}</h1>
          <p className="max-w-[280px] text-base leading-6">{view.sub}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        {(person || shown.ticketId) && (
          <div className="flex flex-col gap-3.5 rounded-card border border-line-soft p-[18px]">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-primary-50 text-base font-bold text-primary">
                {initials(person?.attendeeName ?? '')}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                  Attendee
                </span>
                <b className="block truncate font-display text-[19px] font-bold">
                  {person?.attendeeName || 'Unknown'}
                </b>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line-soft pt-3.5">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                  Ticket type
                </span>
                <b className="block truncate text-[15px]">{person?.ticketTypeName || '—'}</b>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                  Ticket ID
                </span>
                <b className="block truncate font-mono text-[13px] font-semibold">{shown.ticketId ?? '—'}</b>
              </div>
            </div>
          </div>
        )}
        <p className="text-center text-sm leading-[21px] text-slate-600">{view.note}</p>
        <button
          type="button"
          onClick={onNext}
          autoFocus
          className="mt-auto flex h-14 items-center justify-center gap-2.5 rounded-input bg-ink text-[17px] font-semibold text-white focus-ring"
        >
          <Icon icon={faQrcode} />
          Scan next
        </button>
      </div>
    </div>
  );
}
