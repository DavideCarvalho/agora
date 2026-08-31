// Provider-aware docs for the payments library. The reader picks the gateway they use once (the
// selector on every /docs/payments page) and the pages follow: `<ProviderTabs>` switch to it,
// `<ProviderMatrix>` highlights its row, `<ProviderSummary>` restates that row at the top of the
// page. Nothing is hidden until a gateway is picked — the default is today's "show everything".
//
// The provider list is not hardcoded: it is read off the provider pages that exist under
// content/docs/payments/providers (`getPaymentsProviders` in lib/source.ts), so a driver added to
// the library appears in the selector the moment its docs page is synced. This file holds only
// what the client components need — no server imports.

export interface PaymentsProvider {
  /** The provider page slug — `stripe`, `abacate`, `woovi`… — and the value stored as the selection. */
  slug: string;
  /** The page title — `Stripe`, `AbacatePay`, `Woovi (OpenPix)`… */
  title: string;
  /** The provider page URL (site-relative; render it through `next/link` so basePath applies). */
  url: string;
}

export const PROVIDER_STORAGE_KEY = 'agora.payments.provider';
export const PROVIDER_QUERY_PARAM = 'provider';

/** Fold a gateway name to a comparison key: `Pagar.me` → `pagarme`, `Efí` → `efi`, `Mercado Pago` → `mercadopago`. */
export function providerKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve a gateway as the docs spell it — a tab label (`AbacatePay`), a table cell (`Woovi`), a
 * slug (`abacate`) — to the provider it names. Exact matches on slug or title win; otherwise a
 * prefix in either direction (`abacatepay` starts with the slug `abacate`; the title
 * `wooviopenpix` starts with the label `woovi`), guarded by length so a short stray word never
 * matches anything.
 */
export function matchProvider(
  label: string,
  providers: readonly PaymentsProvider[],
): PaymentsProvider | undefined {
  const key = providerKey(label);
  if (!key) return undefined;
  const exact = providers.find(
    (p) => p.slug === key || providerKey(p.title) === key,
  );
  if (exact) return exact;
  if (key.length < 4) return undefined;
  return providers.find(
    (p) => key.startsWith(p.slug) || providerKey(p.title).startsWith(key),
  );
}

/**
 * How fumadocs' simple-mode `<Tabs items>` derives a tab's value from its label (only the first
 * whitespace is replaced — that is their implementation, mirrored so a controlled value matches).
 */
export function tabValue(label: string): string {
  return label.toLowerCase().replace(/\s/, '-');
}
