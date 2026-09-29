import Link from 'next/link';
import { Fragment } from 'react';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Icon } from './Icon';

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center text-[13px] text-slate-500">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li>
                {c.href && !last ? (
                  <Link href={c.href} className="hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span className={last ? 'text-ink' : undefined} aria-current={last ? 'page' : undefined}>
                    {c.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className="mx-1.5">
                  <Icon icon={faChevronRight} className="text-[9px]" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
