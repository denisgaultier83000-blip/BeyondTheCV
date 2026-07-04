
import { StripeConstructorOptions } from '@stripe/stripe-js';

declare module '@stripe/stripe-js' {
  interface StripeConstructorOptions {
    advancedFraudSignals?: boolean;
  }
}
