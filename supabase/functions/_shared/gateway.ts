// What a provider adapter must produce. The webhook function does everything
// else (idempotency, amount check, status rules) in the database.
export interface GatewayEvent {
  eventId: string            // unique per notification, used for idempotency
  providerReference: string  // the id we stored in payments.provider_reference
  status: 'paid' | 'failed'
  amount: number | null      // BDT amount the provider says was paid
  currency: string
  raw: Record<string, unknown> // sanitized copy for audit; remove any secrets
}

export interface GatewayAdapter {
  name: string // stored in payments.provider
  // Verify the provider's signature / validation call. Return null if invalid.
  verifyAndParse(req: Request, rawBody: string): Promise<GatewayEvent | null>
}

// Return your adapter here once a provider is chosen, e.g.
//   return sslcommerzAdapter
// Secrets come from Deno.env.get(...), set with `supabase secrets set`.
export function getAdapter(): GatewayAdapter | null {
  return null
}