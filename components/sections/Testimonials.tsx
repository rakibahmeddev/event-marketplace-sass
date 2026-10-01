import { faStar } from '@fortawesome/free-solid-svg-icons';
import { initials } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import type { Section } from '@/lib/pages/schema';

/** "Loved by fans & organizers" (design 02). Quotes are the marketplace's own, entered in Admin → Pages. */
export function TestimonialsSection({ section }: { section: Extract<Section, { type: 'testimonials' }> }) {
  return (
    <section
      aria-labelledby="testimonials-title"
      className="page-container flex flex-col gap-10 py-14 md:py-20"
    >
      <h2 id="testimonials-title" className="type-h2">
        {section.title}
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {section.quotes.map((q, i) => (
          <figure key={i} className="m-0 flex flex-col gap-5 rounded-card border border-line-soft p-8">
            <div className="flex gap-1 text-sm text-accent" aria-hidden>
              {Array.from({ length: 5 }, (_, k) => (
                <Icon key={k} icon={faStar} />
              ))}
            </div>
            <blockquote className="m-0 font-display text-lg leading-7 font-semibold text-pretty">
              “{q.text}”
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary-50 text-[15px] font-bold text-primary">
                {initials(q.name) || '?'}
              </span>
              <span className="flex flex-col">
                <b className="text-[15px]">{q.name}</b>
                {q.role && <span className="text-[13px] text-slate-500">{q.role}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
