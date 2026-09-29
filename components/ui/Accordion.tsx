import type { ReactNode } from 'react';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type Props = { question: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string };

/** FAQ item. Native <details> — accessible and works without JS. */
export function AccordionItem({ question, children, defaultOpen, className }: Props) {
  return (
    <details
      open={defaultOpen}
      className={cn('group rounded-[14px] border border-line-soft px-[22px] py-5', className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-bold outline-none focus-visible:text-primary [&::-webkit-details-marker]:hidden">
        {question}
        <Icon icon={faPlus} className="shrink-0 text-primary group-open:hidden" />
        <Icon icon={faMinus} className="hidden shrink-0 text-primary group-open:inline" />
      </summary>
      <div className="mt-2.5 text-[15px] leading-6 text-slate-600">{children}</div>
    </details>
  );
}
