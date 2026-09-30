'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { categoryIcons } from '@/components/events/categoryIcons';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Choice';
import { Input, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { createCategory, moveCategory, setCategoryActive, updateCategory } from '@/lib/categories/actions';
import { CATEGORY_ICONS, type Category, type CategoryIcon } from '@/lib/categories/schema';

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, startTransition] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.fieldErrors ? (Object.values(res.fieldErrors)[0] ?? res.error) : res.error);
      else {
        setError(undefined);
        router.refresh();
      }
    });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    run(async () => {
      const res = await createCategory({
        name: String(data.get('name') ?? ''),
        icon: String(data.get('icon') ?? 'other'),
      });
      if (res.ok) form.reset();
      return res;
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {error && <Alert tone="danger">{error}</Alert>}
      <ul
        className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line-soft bg-white"
        aria-busy={busy}
      >
        {categories.map((c, i) => (
          <Row key={c.id} c={c} first={i === 0} last={i === categories.length - 1} busy={busy} run={run} />
        ))}
      </ul>
      <form
        onSubmit={onAdd}
        className="flex flex-col gap-3 rounded-card border border-line-soft bg-white p-5 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm font-semibold">
          New category
          <Input name="name" placeholder="e.g. Food & Drink" maxLength={40} required />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold sm:w-44">
          Icon
          <Select name="icon" defaultValue="other">
            {CATEGORY_ICONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>
    </div>
  );
}

function Row({
  c,
  first,
  last,
  busy,
  run,
}: {
  c: Category;
  first: boolean;
  last: boolean;
  busy: boolean;
  run: (fn: () => Promise<Result>) => void;
}) {
  const [name, setName] = useState(c.name);
  const [icon, setIcon] = useState<CategoryIcon>(c.icon);
  const dirty = name !== c.name || icon !== c.icon;
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
        <Icon icon={categoryIcons[icon]} />
      </span>
      <Input
        aria-label={`${c.name} name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-10 min-w-40 flex-1"
        maxLength={40}
      />
      <Select
        aria-label={`${c.name} icon`}
        value={icon}
        onChange={(e) => setIcon(e.target.value as CategoryIcon)}
        className="h-10 w-36"
      >
        {CATEGORY_ICONS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </Select>
      {dirty && (
        <Button size="sm" onClick={() => run(() => updateCategory(c.id, { name, icon }))} disabled={busy}>
          Save
        </Button>
      )}
      <Switch
        label="Visible"
        checked={c.active}
        disabled={busy}
        onChange={(e) => run(() => setCategoryActive(c.id, e.target.checked))}
        className="text-sm"
      />
      <div className="flex">
        <button
          type="button"
          aria-label={`Move ${c.name} up`}
          disabled={first || busy}
          onClick={() => run(() => moveCategory(c.id, 'up'))}
          className="grid size-9 place-items-center rounded-input text-slate-600 hover:bg-mist disabled:text-slate-300 focus-ring"
        >
          <Icon icon={faArrowUp} />
        </button>
        <button
          type="button"
          aria-label={`Move ${c.name} down`}
          disabled={last || busy}
          onClick={() => run(() => moveCategory(c.id, 'down'))}
          className="grid size-9 place-items-center rounded-input text-slate-600 hover:bg-mist disabled:text-slate-300 focus-ring"
        >
          <Icon icon={faArrowDown} />
        </button>
      </div>
    </li>
  );
}
