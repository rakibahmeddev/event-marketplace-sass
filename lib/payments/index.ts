import 'server-only';

import { stripeProvider } from './stripe';
import { testPaymentsAllowed, testProvider } from './test';
import type { PaymentProvider, ProviderId } from './types';

export function getPaymentProvider(id: ProviderId): PaymentProvider {
  if (id === 'stripe') return stripeProvider;
  if (id === 'test' && testPaymentsAllowed()) return testProvider;
  throw new Error(`Payment provider "${id}" is not available`);
}

export type { PaymentProvider, ProviderId } from './types';
