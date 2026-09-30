'use client';

import { useState } from 'react';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? 'Link copied' : 'Share event'}
      className="grid size-11 place-items-center rounded-full bg-white text-ink shadow-badge hover:bg-mist focus-ring"
    >
      <Icon icon={faShareNodes} />
      <span role="status" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
    </button>
  );
}
