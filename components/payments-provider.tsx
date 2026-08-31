'use client';

// The provider-aware pieces of the payments docs — see lib/payments-providers.ts for the idea.
//
// `PaymentsProviderScope` (mounted once, in the docs layout) owns the selection: it is remembered
// in localStorage, mirrored into `?provider=` so a page can be shared as "the Asaas version", and
// followed across tabs via the `storage` event. The MDX-facing components are registered as bare
// tags in components/mdx.tsx, so the library's docs use them without importing anything.

import { Tabs, type TabsProps } from 'fumadocs-ui/components/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  matchProvider,
  type PaymentsProvider,
  PROVIDER_QUERY_PARAM,
  PROVIDER_STORAGE_KEY,
  tabValue,
} from '@/lib/payments-providers';

/** A capability matrix as `<ProviderMatrix>` read it: the header row, then one row per gateway. */
interface MatrixData {
  headers: string[];
  rows: Record<string, string[]>;
}

interface Scope {
  providers: readonly PaymentsProvider[];
  selected: PaymentsProvider | null;
  select: (slug: string | null) => void;
  matrices: Record<string, MatrixData>;
  registerMatrix: (id: string, data: MatrixData) => void;
}

const ScopeContext = createContext<Scope | null>(null);

function useScope(): Scope {
  const scope = useContext(ScopeContext);
  if (!scope) {
    throw new Error(
      'Payments provider components must render inside <PaymentsProviderScope>',
    );
  }
  return scope;
}

export function PaymentsProviderScope({
  providers,
  children,
}: {
  providers: PaymentsProvider[];
  children: ReactNode;
}) {
  // `undefined` until the first effect has read the URL and localStorage; `null` is "none picked".
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  const [matrices, setMatrices] = useState<Record<string, MatrixData>>({});
  const pathname = usePathname();

  const known = useCallback(
    (candidate: string | null) =>
      candidate && providers.some((p) => p.slug === candidate)
        ? candidate
        : null,
    [providers],
  );

  // First paint is server-rendered with nothing selected; the remembered choice lands right after
  // mount. A `?provider=` in the URL (a shared link) beats what this browser remembers.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(
      PROVIDER_QUERY_PARAM,
    );
    setSlug(
      known(fromUrl) ??
        known(window.localStorage.getItem(PROVIDER_STORAGE_KEY)),
    );

    const onStorage = (event: StorageEvent) => {
      if (event.key === PROVIDER_STORAGE_KEY) setSlug(known(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [known]);

  // Keep `?provider=` on the URL through client-side navigation, so copying the address bar from
  // any page shares the same view. Never before the initial read, or it would erase the very
  // param that read is about to honour.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `pathname` is the trigger — navigation drops the query param
  useEffect(() => {
    if (slug === undefined) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(PROVIDER_QUERY_PARAM) === slug) return;
    if (slug) url.searchParams.set(PROVIDER_QUERY_PARAM, slug);
    else url.searchParams.delete(PROVIDER_QUERY_PARAM);
    window.history.replaceState(window.history.state, '', url);
  }, [slug, pathname]);

  const select = useCallback(
    (next: string | null) => {
      const value = known(next);
      setSlug(value);
      if (value) window.localStorage.setItem(PROVIDER_STORAGE_KEY, value);
      else window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
    },
    [known],
  );

  const registerMatrix = useCallback((id: string, data: MatrixData) => {
    setMatrices((current) => ({ ...current, [id]: data }));
  }, []);

  const scope = useMemo<Scope>(
    () => ({
      providers,
      selected: providers.find((p) => p.slug === slug) ?? null,
      select,
      matrices,
      registerMatrix,
    }),
    [providers, slug, select, matrices, registerMatrix],
  );

  return <ScopeContext value={scope}>{children}</ScopeContext>;
}

/** The selector itself — rendered by the docs page header on every /docs/payments page. */
export function ProviderSelect() {
  const { providers, selected, select } = useScope();
  if (providers.length === 0) return null;

  return (
    <div className="ms-auto flex items-center gap-2 text-sm">
      <label
        htmlFor="agora-payments-provider"
        className="text-fd-muted-foreground"
      >
        Gateway
      </label>
      <select
        id="agora-payments-provider"
        value={selected?.slug ?? ''}
        onChange={(event) => select(event.target.value || null)}
        className="rounded-md border bg-fd-secondary px-2 py-1.5 text-sm text-fd-secondary-foreground outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      >
        <option value="">All gateways</option>
        {providers.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.title}
          </option>
        ))}
      </select>
      {selected && (
        <Link
          href={selected.url}
          className="text-fd-primary hover:underline whitespace-nowrap"
        >
          Guide →
        </Link>
      )}
    </div>
  );
}

type ProviderTabsProps = Omit<
  TabsProps,
  'items' | 'defaultIndex' | 'defaultValue'
> & { items: string[] };

/**
 * `<Tabs>` whose tabs are gateways: it follows the selected provider and, when the reader clicks a
 * tab, that becomes the selection everywhere. When the selected gateway has no tab here (Stripe on
 * the Pix page) the reader's last local pick stays open and a line underneath says so.
 */
export function ProviderTabs({ items, children, ...rest }: ProviderTabsProps) {
  const { providers, selected, select } = useScope();
  const slugs = useMemo(
    () => items.map((label) => matchProvider(label, providers)?.slug ?? null),
    [items, providers],
  );
  const [local, setLocal] = useState(items[0]);

  const selectedIndex = selected ? slugs.indexOf(selected.slug) : -1;
  const active = selectedIndex >= 0 ? items[selectedIndex] : local;
  const notCovered = selected !== null && selectedIndex < 0;

  // Remember what is on screen, so switching to a gateway with no tab here keeps the tab the
  // reader was looking at rather than snapping back to the first one.
  useEffect(() => {
    if (selectedIndex >= 0) setLocal(items[selectedIndex]);
  }, [selectedIndex, items]);

  // fumadocs' simple-mode `Tabs` spreads the remaining props onto the primitive *after* its own
  // `value`/`onValueChange`, so passing ours makes it controlled (fumadocs-ui 16.15,
  // dist/components/tabs.js). Its types omit the two; a JSX spread does not excess-check them.
  const controlled = {
    value: tabValue(active),
    onValueChange: (value: string) => {
      const index = items.findIndex((label) => tabValue(label) === value);
      if (index < 0) return;
      setLocal(items[index]);
      const slug = slugs[index];
      if (slug) select(slug);
    },
  };

  return (
    <div className="my-4">
      <Tabs items={items} className="my-0" {...rest} {...controlled}>
        {children}
      </Tabs>
      {notCovered && selected && (
        <p className="mt-1.5 text-xs text-fd-muted-foreground">
          {selected.title} is not covered in this section — showing {active}.{' '}
          <Link href={selected.url} className="text-fd-primary hover:underline">
            {selected.title} guide →
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * Wraps a markdown table whose first column names a gateway. The selected provider's row is
 * highlighted (CSS in app/global.css) and the others recede; with an `id`, the table is also
 * offered to `<ProviderSummary matrix={id}>`. Nothing is removed — a matrix is for comparing.
 */
export function ProviderMatrix({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  const { providers, selected, registerMatrix } = useScope();
  const ref = useRef<HTMLDivElement>(null);

  // Tag each row with the provider its first cell names. Once: the table is static content.
  useEffect(() => {
    const table = ref.current?.querySelector('table');
    if (!table) return;
    const headers = Array.from(table.querySelectorAll('thead th'), (th) =>
      (th.textContent ?? '').trim(),
    );
    const rows: Record<string, string[]> = {};
    for (const row of table.querySelectorAll('tbody tr')) {
      const first = row.querySelector('td');
      const provider = first
        ? matchProvider(first.textContent ?? '', providers)
        : undefined;
      if (!provider) continue;
      row.setAttribute('data-provider', provider.slug);
      // A gateway may have two rows (Woovi's two signing schemes); the summary shows the first.
      rows[provider.slug] ??= Array.from(row.querySelectorAll('td'), (td) =>
        (td.textContent ?? '').trim(),
      );
    }
    if (id) registerMatrix(id, { headers, rows });
  }, [providers, id, registerMatrix]);

  useEffect(() => {
    const rows = ref.current?.querySelectorAll('tbody tr[data-provider]') ?? [];
    for (const row of rows) {
      row.toggleAttribute(
        'data-selected',
        row.getAttribute('data-provider') === selected?.slug,
      );
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className="agora-provider-matrix"
      data-has-selection={selected ? '' : undefined}
    >
      {children}
    </div>
  );
}

/**
 * The selected gateway's row of a `<ProviderMatrix id>`, restated as a label/value list — meant
 * for the top of a page whose matrix sits at the bottom. With no selection it is a one-line nudge
 * towards the selector; with one, the reader learns what changes for them before the prose.
 */
export function ProviderSummary({ matrix }: { matrix: string }) {
  const { selected, matrices } = useScope();

  if (!selected) {
    return (
      <p className="my-4 text-sm text-fd-muted-foreground">
        Using one gateway? Pick it at the top of the page and this page
        highlights what yours sends.
      </p>
    );
  }

  const data = matrices[matrix];
  if (!data) return null;
  const cells = data.rows[selected.slug];

  return (
    <div className="not-prose my-6 rounded-xl border bg-fd-card p-4">
      <p className="text-sm font-medium text-fd-card-foreground">
        With {selected.title}
      </p>
      {cells ? (
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
          {data.headers.slice(1).map((header, i) => (
            <Fragment key={header}>
              <dt className="text-fd-muted-foreground">{header}</dt>
              <dd className="text-fd-card-foreground">{cells[i + 1]}</dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-sm text-fd-muted-foreground">
          This table has no row for {selected.title}.
        </p>
      )}
    </div>
  );
}
