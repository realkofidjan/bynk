/* ────────────────────────────────────────
   Paystack Integration Helper
   ──────────────────────────────────────── */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/** Standard Paystack Ghana local transaction fee rate (1.95%) */
export const PAYSTACK_FEE_PERCENT = 1.95;

/**
 * Calculate gross charge amount in pesewas so that the client incurs the Paystack fee,
 * ensuring the photographer/merchant receives exactly 100% of the net GHS amount without deductions.
 * Formula: Gross = Net / (1 - FeeRate)
 */
export function calculateGrossAmountInPesewas(netGhs: number, feePercent: number = PAYSTACK_FEE_PERCENT) {
  const feeRate = feePercent / 100;
  const grossGhsExact = netGhs / (1 - feeRate);
  const grossPesewas = Math.ceil(grossGhsExact * 100);
  const grossGhs = Math.round(grossPesewas) / 100;
  const feeGhs = Math.round((grossGhs - netGhs) * 100) / 100;
  return { grossGhs, grossPesewas, feeGhs };
}

export type InitializePaymentParams = {
  email: string;
  clientName?: string;
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
  grossGhs?: number;
  netGhs?: number;
  feeGhs?: number;
  error?: string;
};

/**
 * Initialize a Paystack transaction for deposit, full payment, or remaining balance.
 * Automatically adds the 1.95% transaction fee so clients incur the fee.
 */
export async function initializePaystackTransaction({
  email,
  clientName,
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

  // Calculate net amount in GHS
  const netGhs = exactAmountInGhs !== undefined
    ? Math.round(exactAmountInGhs)
    : Math.round((amountInGhs * depositPercentage) / 100);

  // Compute gross amount in pesewas with Paystack processing fee incurred by client
  const { grossGhs, grossPesewas, feeGhs } = calculateGrossAmountInPesewas(netGhs);

  const reference = `BYNK_${bookingId.slice(0, 8)}_${Date.now()}`;

  // Parse client first and last name
  const nameStr = (clientName || metadata.name || metadata.client_name || '').trim();
  const nameParts = nameStr.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  const customFields = [
    ...(nameStr ? [{ display_name: 'Client Name', variable_name: 'client_name', value: nameStr }] : []),
    ...(metadata.category ? [{ display_name: 'Category', variable_name: 'category', value: String(metadata.category) }] : []),
    ...(metadata.tier ? [{ display_name: 'Package Tier', variable_name: 'tier', value: String(metadata.tier) }] : []),
    { display_name: 'Net Amount', variable_name: 'net_amount', value: `GHS ${netGhs.toLocaleString()}` },
    { display_name: 'Processing Fee (1.95%)', variable_name: 'processing_fee', value: `GHS ${feeGhs.toFixed(2)}` },
  ];

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: grossPesewas,
        currency: 'GHS',
        reference,
        callback_url: callbackUrl,
        first_name: firstName,
        last_name: lastName,
        metadata: {
          booking_id: bookingId,
          client_name: nameStr,
          total_price_ghs: amountInGhs,
          net_charge_ghs: netGhs,
          gross_charge_ghs: grossGhs,
          processing_fee_ghs: feeGhs,
          client_incurs_fee: true,
          custom_fields: customFields,
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
      grossGhs,
      netGhs,
      feeGhs,
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
    return { success: false, error: 'PAYSTACK_SECRET_KEY is not configured' };
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Transaction verification failed' };
    }

    return {
      success: true,
      status: data.data.status,
      amount: data.data.amount / 100, // in GHS
      metadata: data.data.metadata,
      customer: data.data.customer,
    };
  } catch (err: any) {
    console.error('Paystack verification error:', err);
    return { success: false, error: err.message || 'Verification failed' };
  }
}

export type RefundPaymentParams = {
  reference: string;
  amountInGhs?: number; // if specified, partial refund amount in GHS
  merchantNote?: string;
};

export type RefundPaymentResult = {
  success: boolean;
  refundId?: string;
  status?: string;
  error?: string;
};

/**
 * Issue an automated refund via Paystack API directly to customer's Mobile Money or Bank Card.
 */
export async function refundPaystackTransaction({
  reference,
  amountInGhs,
  merchantNote = 'BYNK Photography add-on refund',
}: RefundPaymentParams): Promise<RefundPaymentResult> {
  if (!PAYSTACK_SECRET_KEY) {
    return { success: false, error: 'PAYSTACK_SECRET_KEY is not configured' };
  }

  try {
    const payload: Record<string, any> = {
      transaction: reference,
      merchant_note: merchantNote,
    };

    if (amountInGhs && amountInGhs > 0) {
      payload.amount = Math.round(amountInGhs * 100); // pesewas
    }

    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      console.error('Paystack refund API error:', data);
      return {
        success: false,
        error: data.message || 'Paystack refund call failed',
      };
    }

    return {
      success: true,
      refundId: String(data.data?.id || ''),
      status: data.data?.status || 'processed',
    };
  } catch (err: any) {
    console.error('Paystack refund exception:', err);
    return { success: false, error: err.message || 'Failed to communicate with Paystack Refund API' };
  }
}
