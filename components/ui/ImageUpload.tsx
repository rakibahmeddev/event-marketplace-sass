'use client';

import Image from 'next/image';
import { useId, useRef, useState, type DragEvent } from 'react';
import { faCloudArrowUp, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { uploadImage, validateImageFile } from '@/lib/storage/client';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

export type UploadedImage = { path: string; previewUrl: string };

type Props = {
  authTenantId: string;
  /** Storage folder the rules allow for this user, ending with "/". */
  folder: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  max?: number;
  label: string;
  hint?: string;
  aspect?: 'square' | 'wide';
  error?: string;
};

/** Drag-and-drop / browse image uploader (design 08 logo drop zone, design 09 images). */
export function ImageUpload({
  authTenantId,
  folder,
  value,
  onChange,
  max = 1,
  label,
  hint,
  aspect = 'wide',
  error,
}: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [dragging, setDragging] = useState(false);

  async function add(files: FileList | File[]) {
    setProblem(undefined);
    const list = [...files].slice(0, max - value.length);
    for (const f of list) {
      const p = validateImageFile(f);
      if (p) return setProblem(p);
    }
    setBusy(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const f of list)
        uploaded.push({
          path: await uploadImage(authTenantId, folder, f),
          previewUrl: URL.createObjectURL(f),
        });
      onChange(max === 1 ? uploaded : [...value, ...uploaded]);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
  }

  const message = problem ?? error;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold" id={`${id}-label`}>
        {label}
      </span>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {value.map((img, i) => (
            <li
              key={img.path}
              className={cn(
                'relative overflow-hidden rounded-lg border border-line-soft bg-mist',
                aspect === 'square' ? 'size-24' : 'h-24 w-40',
              )}
            >
              <Image src={img.previewUrl} alt="" fill sizes="160px" className="object-cover" unoptimized />
              {i === 0 && max > 1 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.path !== img.path))}
                aria-label="Remove image"
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-white/95 text-xs text-danger shadow-badge hover:bg-white focus-ring"
              >
                <Icon icon={faTrashCan} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex h-24 cursor-pointer items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed px-4 text-center text-sm text-slate-600 transition-colors focus-within:border-primary',
            dragging ? 'border-primary bg-primary-50' : 'border-slate-250 hover:border-primary',
            !!message && 'border-danger',
            busy && 'pointer-events-none opacity-60',
          )}
        >
          <Icon icon={faCloudArrowUp} className="text-xl text-primary" />
          <span>
            {busy ? (
              'Uploading…'
            ) : (
              <>
                Drop an image or <b className="text-primary">browse</b>
              </>
            )}
          </span>
          <input
            ref={input}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={max > 1}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-hint`}
            onChange={(e) => e.target.files && void add(e.target.files)}
          />
        </label>
      )}
      <p
        id={`${id}-hint`}
        className={cn('text-xs', message ? 'text-danger' : 'text-slate-500')}
        role={message ? 'alert' : undefined}
      >
        {message ?? hint ?? 'JPG, PNG or WebP, up to 5 MB.'}
      </p>
    </div>
  );
}
