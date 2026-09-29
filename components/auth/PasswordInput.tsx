'use client';

import { useState, type ComponentProps } from 'react';
import { faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import { Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-md text-slate-500 hover:text-ink focus-ring"
        >
          <Icon icon={visible ? faEyeSlash : faEye} />
        </button>
      }
    />
  );
}
