import type { Section } from '@/lib/pages/schema';
import { cn } from '@/lib/utils/cn';

/** Marketplace numbers (design 11): big figure over a coloured rule; the last one in coral. */
export function StatsSection({
  section,
  className,
}: {
  section: Extract<Section, { type: 'stats' }>;
  className?: string;
}) {
  return (
    <section
      aria-label={section.title || 'In numbers'}
      className={cn('page-container py-14 md:py-[72px]', className)}
    >
      {section.title && <h2 className="type-h3 mb-8">{section.title}</h2>}
      <dl className={cn('grid grid-cols-2 gap-6', section.items.length > 2 && 'lg:grid-cols-4')}>
        {section.items.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col-reverse gap-1 border-t-[3px] pt-5',
              i === section.items.length - 1 && section.items.length > 1 ? 'border-accent' : 'border-primary',
            )}
          >
            <dt className="text-[15px] text-slate-600">{s.label}</dt>
            <dd className="font-display text-[32px] leading-none font-extrabold md:text-[40px]">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
