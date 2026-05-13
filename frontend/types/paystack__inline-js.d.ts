declare module "@paystack/inline-js" {
  interface PaystackTransactionOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    ref?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (transaction: { reference: string; [key: string]: unknown }) => void;
    onCancel?: () => void;
    onLoad?: (response: unknown) => void;
  }

  class PaystackPop {
    newTransaction(options: PaystackTransactionOptions): void;
  }

  export default PaystackPop;
}
