/* ────────────────────────────────────────
   Paystack Integration Helper
   ──────────────────────────────────────── */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export type InitializePaymentParams = {
  email: string;
  amountInGhs: number; // total package price e.g. 1500
  depositPercentage?: number; // default 50%
  exactAmountInGhs?: number; // if provided, charge this exact GHS amount directly
  bookingId: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
};

export type InitializePaymentResult = {
  success: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
};

/**
 * Initialize a Paystack transaction for deposit or remaining balance.
 */
export async function initializePaystackTransaction({
  email,
  amountInGhs,
  depositPercentage = 50,
  exactAmountInGhs,
  bookingId,
  callbackUrl,
  metadata = {},
}: InitializePaymentParams): Promise<InitializePaymentResult> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'PAYSTACK_SECRET_KEY is not configured' };
  }

  // Calculate charge amount in GHS, then convert to pesewas (* 100)
  const depositGhs = exactAmountInGhs !== undefined
    ? Math.round(exactAmountInGhs)
    : Math.round((amountInGhs * depositPercentage) / 100);
  const amountInPesewas = depositGhs * 100;

  const reference = `BYNK_${bookingId.slice(0, 8)}_${Date.now()}`;

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        callback_url: callbackUrl,
        metadata: {
          booking_id: bookingId,
          total_price_ghs: amountInGhs,
          deposit_ghs: depositGhs,
          ...metadata,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      console.error('Paystack initialize error:', data);
      return { success: false, error: data.message || 'Failed to initialize payment' };
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference,
    };
  } catch (err: any) {
    console.error('Paystack request exception:', err);
    return { success: false, error: err.message || 'Paystack request failed' };
  }
}

/**
 * Verify a Paystack transaction by reference.
 */
export async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Paystack verification failed');
  }

  return data.data;
}
