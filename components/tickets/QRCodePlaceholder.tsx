import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';

/**
 * Stand-in for the signed ticket QR (ticketId + tenantId + HMAC), which is
 * generated server-side in Phase 4. Deliberately not a scannable code.
 */
export function QRCodePlaceholder({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Ticket QR code (placeholder)"
      className={cn(
        'grid aspect-square w-full place-items-center rounded-[10px] bg-mist text-6xl text-line-strong',
        className,
      )}
    >
      <Icon icon={faQrcode} />
    </div>
  );
}
