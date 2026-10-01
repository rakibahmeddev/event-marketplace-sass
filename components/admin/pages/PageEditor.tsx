'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  faArrowDown,
  faArrowUp,
  faEye,
  faGripVertical,
  faPlus,
  faRotateLeft,
  faThumbtack,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Choice';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload, type UploadedImage } from '@/components/ui/ImageUpload';
import { publishPage, resetPageDraft, savePageDraft } from '@/lib/pages/actions';
import { SECTION_SPECS, type FieldSpec, type ListSpec } from '@/lib/pages/fields';
import type { PageId, Section } from '@/lib/pages/schema';
import { cn } from '@/lib/utils/cn';

/** Editor copy of a section: images carry a preview URL; only their Storage path is sent back. */
type Draft = Record<string, unknown> & { type: Section['type']; enabled: boolean };

function toDraft(s: Section): Draft {
  const d = structuredClone(s) as unknown as Draft;
  if ('image' in s) d.image = s.image ? { path: s.image.path, previewUrl: s.image.url } : null;
  return d;
}

function toPayload(page: PageId, list: Draft[]) {
  return {
    page,
    sections: list.map((d) => {
      if (!('image' in d)) return d;
      const img = d.image as UploadedImage | null;
      return { ...d, image: img ? { path: img.path } : null };
    }),
  };
}

type Props = {
  page: PageId;
  publicPath: string;
  initial: Section[];
  unpublished: boolean;
  publishedLabel: string | null;
  authTenantId: string;
  imageFolder: string;
};

/**
 * Admin → Pages editor: reorder (drag or ↑↓), show/hide, edit text and photos, then Save draft,
 * Preview (draft, admins only) or Publish. Everything is validated again on the server.
 */
export function PageEditor({
  page,
  publicPath,
  initial,
  unpublished,
  publishedLabel,
  authTenantId,
  imageFolder,
}: Props) {
  const [sections, setSections] = useState<Draft[]>(() => initial.map(toDraft));
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(unpublished);
  const [pending, setPending] = useState<'save' | 'preview' | 'publish' | 'reset' | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sectionErrors = useMemo(() => {
    const out = new Set<number>();
    for (const k of Object.keys(errors)) out.add(Number(k.split('.')[0]));
    return out;
  }, [errors]);

  function update(next: Draft[]) {
    setSections(next);
    setDirty(true);
    setMessage(null);
  }

  function move(from: number, to: number) {
    if (from === 0 || to === 0 || to < 0 || to >= sections.length || from === to) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    update(next);
    setSelected(to);
    setErrors({}); // indexes changed
  }

  function setField(i: number, key: string, value: unknown) {
    update(sections.map((s, k) => (k === i ? { ...s, [key]: value } : s)));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([p]) => p !== `${i}.${key}`)));
  }

  function setListItem(i: number, list: string, idx: number, key: string, value: string) {
    const items = [...((sections[i]![list] as Record<string, string>[]) ?? [])];
    items[idx] = { ...items[idx]!, [key]: value };
    setField(i, list, items);
  }

  async function run(kind: 'save' | 'preview' | 'publish') {
    setPending(kind);
    setMessage(null);
    // Open the tab during the click (popup blockers allow that), then send it to the preview once saved.
    const tab = kind === 'preview' ? window.open('', '_blank') : null;
    if (tab) tab.opener = null;
    const res = await (kind === 'publish' ? publishPage : savePageDraft)(toPayload(page, sections));
    setPending(null);
    if (!res.ok) {
      tab?.close();
      setErrors(res.fieldErrors ?? {});
      const first = Object.keys(res.fieldErrors ?? {})[0];
      if (first) setSelected(Number(first.split('.')[0]) || 0);
      setMessage({ tone: 'danger', text: res.error });
      return;
    }
    setErrors({});
    setDirty(false);
    setHasDraft(kind !== 'publish');
    if (tab) tab.location.href = `${publicPath}?preview=1`;
    setMessage({
      tone: 'success',
      text:
        kind === 'publish'
          ? 'Published. Visitors now see these changes.'
          : 'Draft saved. Visitors still see the published page.',
    });
  }

  async function reset() {
    if (
      !window.confirm(
        'Reset this page to the built-in content? Your draft is replaced (the live page stays until you publish).',
      )
    )
      return;
    setPending('reset');
    const res = await resetPageDraft({ page });
    setPending(null);
    if (!res.ok) return setMessage({ tone: 'danger', text: res.error });
    setSections(res.data.sections.map(toDraft));
    setSelected(0);
    setErrors({});
    setDirty(false);
    setHasDraft(true);
    setMessage({ tone: 'success', text: 'Draft reset to the built-in content. Publish to make it live.' });
  }

  const current = sections[selected]!;
  const spec = SECTION_SPECS[current.type];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-card border border-line-soft bg-white p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600" role="status">
          {dirty ? (
            <b className="text-warning-ink">Unsaved changes</b>
          ) : hasDraft ? (
            <b className="text-warning-ink">Draft not published yet</b>
          ) : (
            <span>Everything is published</span>
          )}
          {publishedLabel && <span> · Last published {publishedLabel}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            loading={pending === 'reset'}
            disabled={!!pending}
            leadingIcon={<Icon icon={faRotateLeft} />}
          >
            Reset to default
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => run('save')}
            loading={pending === 'save'}
            disabled={!!pending}
          >
            Save draft
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => run('preview')}
            loading={pending === 'preview'}
            disabled={!!pending}
            leadingIcon={<Icon icon={faEye} />}
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => run('publish')}
            loading={pending === 'publish'}
            loadingText="Publishing"
            disabled={!!pending}
          >
            Publish
          </Button>
        </div>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section
          aria-labelledby="sections-title"
          className="flex flex-col gap-2 rounded-card border border-line-soft bg-white p-4"
        >
          <h2 id="sections-title" className="px-1 font-display text-base font-bold">
            Sections
          </h2>
          <p className="px-1 text-xs text-slate-500">
            Drag or use the arrows to reorder. The first section stays on top.
          </p>
          <ol className="flex flex-col gap-1.5">
            {sections.map((s, i) => {
              const pinned = i === 0;
              return (
                <li
                  key={s.type}
                  data-section={s.type}
                  draggable={!pinned}
                  onDragStart={(e: DragEvent) => {
                    setDragFrom(i);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (dragFrom !== null && !pinned) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) move(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className={cn(
                    'flex items-center gap-2 rounded-input border px-2 py-2',
                    i === selected ? 'border-primary bg-primary-50' : 'border-line-soft bg-white',
                    dragFrom === i && 'opacity-50',
                    !s.enabled && 'text-slate-500',
                  )}
                >
                  <span aria-hidden className={cn('w-4 text-slate-400', !pinned && 'cursor-grab')}>
                    <Icon icon={pinned ? faThumbtack : faGripVertical} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-current={i === selected ? 'true' : undefined}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold focus-ring"
                  >
                    {SECTION_SPECS[s.type].label}
                    {!s.enabled && <span className="font-normal"> (hidden)</span>}
                    {sectionErrors.has(i) && <span className="ml-1 text-danger">• fix</span>}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${SECTION_SPECS[s.type].label} up`}
                    disabled={i <= 1}
                    onClick={() => move(i, i - 1)}
                    className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-mist disabled:opacity-30 focus-ring"
                  >
                    <Icon icon={faArrowUp} className="text-xs" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${SECTION_SPECS[s.type].label} down`}
                    disabled={pinned || i === sections.length - 1}
                    onClick={() => move(i, i + 1)}
                    className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-mist disabled:opacity-30 focus-ring"
                  >
                    <Icon icon={faArrowDown} className="text-xs" />
                  </button>
                  <Switch
                    checked={s.enabled}
                    disabled={pinned}
                    onChange={(e) => setField(i, 'enabled', e.currentTarget.checked)}
                    aria-label={`Show ${SECTION_SPECS[s.type].label}`}
                    label={<span className="sr-only">{s.enabled ? 'Shown' : 'Hidden'}</span>}
                  />
                </li>
              );
            })}
          </ol>
        </section>

        <section
          aria-labelledby="section-form-title"
          className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-6"
        >
          <div>
            <h2 id="section-form-title" className="font-display text-lg font-bold">
              {spec.label}
            </h2>
            <p className="text-sm text-slate-600">{spec.description}</p>
            {!current.enabled && (
              <p className="mt-2 text-sm font-semibold text-warning-ink">
                Hidden — turn it on in the list to show it.
              </p>
            )}
          </div>
          {spec.fields.map((f) => (
            <FieldInput
              key={`${selected}-${f.key}`}
              id={`f-${selected}-${f.key}`}
              spec={f}
              value={current[f.key]}
              error={errors[`${selected}.${f.key}`]}
              onChange={(v) => setField(selected, f.key, v)}
              authTenantId={authTenantId}
              imageFolder={imageFolder}
            />
          ))}
          {spec.lists?.map((l) => (
            <ListInput
              key={`${selected}-${l.key}`}
              spec={l}
              sectionIndex={selected}
              items={(current[l.key] as Record<string, string>[]) ?? []}
              errors={errors}
              onItem={(idx, key, v) => setListItem(selected, l.key, idx, key, v)}
              onChange={(items) => setField(selected, l.key, items)}
            />
          ))}
          {spec.fields.length === 0 && !spec.lists && (
            <p className="text-sm text-slate-600">
              Nothing to edit here — you can show, hide or move this section.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function FieldInput({
  id,
  spec,
  value,
  error,
  onChange,
  authTenantId,
  imageFolder,
}: {
  id: string;
  spec: FieldSpec;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
  authTenantId: string;
  imageFolder: string;
}) {
  if (spec.kind === 'image') {
    const img = value as UploadedImage | null;
    return (
      <ImageUpload
        authTenantId={authTenantId}
        folder={imageFolder}
        value={img ? [img] : []}
        onChange={(imgs) => onChange(imgs[0] ?? null)}
        label={spec.label}
        hint={spec.hint}
        error={error}
      />
    );
  }
  const str = typeof value === 'string' ? value : '';
  const counter = `${str.length}/${spec.max}`;
  return (
    <Field
      id={id}
      label={spec.label}
      required={!spec.optional}
      error={error}
      hint={spec.hint ? `${spec.hint} · ${counter}` : counter}
    >
      {spec.kind === 'textarea' ? (
        <Textarea
          id={id}
          value={str}
          maxLength={spec.max}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
      ) : (
        <Input
          id={id}
          value={str}
          maxLength={spec.max}
          onChange={(e) => onChange(e.target.value)}
          invalid={!!error}
        />
      )}
    </Field>
  );
}

function ListInput({
  spec,
  sectionIndex,
  items,
  errors,
  onItem,
  onChange,
}: {
  spec: ListSpec;
  sectionIndex: number;
  items: Record<string, string>[];
  errors: Record<string, string>;
  onItem: (idx: number, key: string, v: string) => void;
  onChange: (items: Record<string, string>[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-input border border-line-soft p-4">
      <legend className="px-1 text-sm font-semibold">{spec.label}</legend>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-3 border-b border-line-soft pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center justify-between">
            <b className="text-sm">
              {spec.itemLabel} {idx + 1}
            </b>
            {spec.min !== spec.max && (
              <button
                type="button"
                disabled={items.length <= spec.min}
                onClick={() => onChange(items.filter((_, k) => k !== idx))}
                aria-label={`Remove ${spec.itemLabel.toLowerCase()} ${idx + 1}`}
                className="grid size-8 place-items-center rounded-md text-slate-500 hover:text-danger disabled:opacity-30 focus-ring"
              >
                <Icon icon={faTrashCan} />
              </button>
            )}
          </div>
          {spec.fields.map((f) => {
            const id = `f-${sectionIndex}-${spec.key}-${idx}-${f.key}`;
            const error = errors[`${sectionIndex}.${spec.key}.${idx}.${f.key}`];
            const str = item[f.key] ?? '';
            return (
              <Field
                key={f.key}
                id={id}
                label={f.label}
                required={!f.optional}
                error={error}
                hint={`${str.length}/${f.max}`}
              >
                {f.kind === 'textarea' ? (
                  <Textarea
                    id={id}
                    value={str}
                    maxLength={f.max}
                    rows={2}
                    onChange={(e) => onItem(idx, f.key, e.target.value)}
                    aria-invalid={!!error}
                  />
                ) : (
                  <Input
                    id={id}
                    value={str}
                    maxLength={f.max}
                    onChange={(e) => onItem(idx, f.key, e.target.value)}
                    invalid={!!error}
                  />
                )}
              </Field>
            );
          })}
        </div>
      ))}
      {spec.min !== spec.max && items.length < spec.max && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          leadingIcon={<Icon icon={faPlus} />}
          onClick={() => onChange([...items, { ...spec.blank }])}
        >
          Add {spec.itemLabel.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}
