import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Styles are imported once in app/globals.css; stop FA injecting a <style> tag (CSP).
config.autoAddCss = false;

type IconProps = {
  icon: IconDefinition;
  className?: string;
  /** Accessible label. Omit for decorative icons (the default). */
  label?: string;
};

/** Font Awesome 6/7 Free icon — Solid for UI & categories, Regular for outline states. */
export function Icon({ icon, className, label }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
