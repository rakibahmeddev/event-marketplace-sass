import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { ScannerShell } from '@/components/scanner/ScannerShell';
import { Icon } from '@/components/ui/Icon';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

// Staff login, event selection, camera scan and result screens are built in Phase 5.
export default async function ScannerPage() {
  const { name } = await getCurrentTenantBranding();
  return (
    <ScannerShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid size-[72px] place-items-center rounded-panel bg-primary text-[30px] text-white">
          <Icon icon={faQrcode} />
        </span>
        <h1 className="font-display text-[26px] leading-[34px] font-extrabold">
          {name}
          <span className="text-accent">.</span> Scan
        </h1>
        <p className="text-[15px] text-slate-600">Check-in for event staff — built in Phase 5.</p>
      </div>
    </ScannerShell>
  );
}
