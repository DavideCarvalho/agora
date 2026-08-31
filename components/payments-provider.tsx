'use client';

// The provider-aware pieces of the payments docs — see lib/payments-providers.ts for the idea.
//
// `PaymentsProviderScope` (mounted once, in the docs layout) owns the selection: it is remembered
// in localStorage, mirrored into `?provider=` so a page can be shared as "the Asaas version", and
// followed across tabs via the `storage` event. The MDX-facing components are registered as bare
// tags in components/mdx.tsx, so the library's docs use them without importing anything.

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { ArrowRight, Check, ChevronsUpDown, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/cn';
import {
  matchProvider,
  type PaymentsProvider,
  PROVIDER_QUERY_PARAM,
  PROVIDER_STORAGE_KEY,
} from '@/lib/payments-providers';

/**
 * A capability matrix as `<ProviderMatrix>` read it: the header row, then one row per gateway. Cells
 * keep their rendered markup (`<code>`, links, emphasis) — a bare `defensePeriodEndsAt` reads as a
 * stray word; the same in code style reads as the field name it is.
 */
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

/**
 * The selector itself — the docs sidebar's banner slot, shown only inside /docs/payments (the
 * layout is shared by every library). Class-for-class the shape of fumadocs' library dropdown
 * right above it (`SidebarTabsDropdown`): same trigger, icon size, type size, list and check.
 */
export function ProviderSelect() {
  const { providers, selected, select } = useScope();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (providers.length === 0) return null;
  if (!pathname.startsWith('/docs/payments')) return null;

  const itemClass =
    'flex items-center gap-2 rounded-lg p-1.5 text-start hover:bg-fd-accent hover:text-fd-accent-foreground';

  const pick = (slug: string | null) => {
    select(slug);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex w-full items-center gap-2 rounded-lg border bg-fd-secondary/50 p-2 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground">
        <div className="size-9 shrink-0 md:size-5">
          <CreditCard className="size-full" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {selected ? selected.title : 'All gateways'}
          </p>
          <p className="text-sm text-fd-muted-foreground md:hidden">
            {selected ? 'Gateway' : 'Pick your gateway'}
          </p>
        </div>
        <ChevronsUpDown className="ms-auto size-4 shrink-0 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="fd-scroll-container flex max-h-80 w-(--radix-popover-trigger-width) flex-col gap-1 overflow-y-auto p-1">
        <button type="button" className={itemClass} onClick={() => pick(null)}>
          <p className="text-sm font-medium leading-none">All gateways</p>
          <Check
            className={cn(
              'ms-auto size-3.5 shrink-0 text-fd-primary',
              selected && 'invisible',
            )}
          />
        </button>
        {providers.map((p) => (
          <button
            type="button"
            key={p.slug}
            className={itemClass}
            onClick={() => pick(p.slug)}
          >
            <p className="text-sm font-medium leading-none">{p.title}</p>
            <Check
              className={cn(
                'ms-auto size-3.5 shrink-0 text-fd-primary',
                selected?.slug !== p.slug && 'invisible',
              )}
            />
          </button>
        ))}
        {selected && (
          <Link
            href={selected.url}
            className={cn(itemClass, 'mt-1 border-t pt-2 rounded-t-none')}
            onClick={() => setOpen(false)}
          >
            <p className="text-[0.8125rem] text-fd-muted-foreground">
              {selected.title} guide
            </p>
            <ArrowRight className="ms-auto size-3.5 shrink-0 text-fd-muted-foreground" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ProviderCaseProps {
  /** Gateways this block is for — slugs or names as the docs spell them, space-separated. */
  for?: string;
  /** Shown when no gateway is picked, and when the picked one has no case (with a note). */
  default?: boolean;
  children?: ReactNode;
}

/** One branch of a `<ProviderSwitch>`; on its own it just renders its children. */
export function ProviderCase({ children }: ProviderCaseProps) {
  return <>{children}</>;
}

/**
 * The `<ProviderCase>` elements among `children`. Looks through host elements and fragments too:
 * MDX wraps JSX in a `<p>` when something sits on the line right above it (a comment, say), and
 * the switch should still find its cases rather than silently render nothing.
 */
function collectCases(children: ReactNode): ReactElement<ProviderCaseProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    // Recognised by shape, not by `child.type === ProviderCase`: the MDX is rendered on the server
    // and these elements cross the server/client boundary, where the type is a client reference
    // that need not be identical to this module's function.
    const props = child.props as ProviderCaseProps;
    if ('for' in props || 'default' in props) {
      return [child as ReactElement<ProviderCaseProps>];
    }
    return typeof child.type === 'string' || child.type === Fragment
      ? collectCases(props.children)
      : [];
  });
}

/**
 * Tabs without the tab bar: renders the `<ProviderCase>` for the selected gateway and nothing
 * else — for places where the reader should just see their gateway's version of a step. With no
 * selection the `default` case shows, with a nudge towards the sidebar selector; a selected gateway
 * that has no case falls back to the default with a note. Without a default, no match renders
 * nothing, which makes a switch a conditional note.
 */
export function ProviderSwitch({ children }: { children?: ReactNode }) {
  const { providers, selected } = useScope();
  const cases = collectCases(children);
  const covers = (c: ReactElement<ProviderCaseProps>) =>
    (c.props.for ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((label) => matchProvider(label, providers)?.slug);

  const match = selected
    ? cases.find((c) => covers(c).includes(selected.slug))
    : undefined;
  const fallback = cases.find((c) => c.props.default);
  const shown = match ?? fallback;
  if (!shown) return null;

  const shownTitle = providers.find((p) => p.slug === covers(shown)[0])?.title;
  const note =
    fallback && cases.length > 1 && !match ? (
      <p className="my-2 text-xs text-fd-muted-foreground">
        {selected ? (
          <>
            {selected.title} is not covered here — showing {shownTitle}.{' '}
            <Link
              href={selected.url}
              className="text-fd-primary hover:underline"
            >
              {selected.title} guide →
            </Link>
          </>
        ) : (
          <>
            Showing {shownTitle} — pick your gateway in the sidebar to see
            yours.
          </>
        )}
      </p>
    ) : null;

  return (
    <>
      {note}
      {shown}
    </>
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
        td.innerHTML.trim(),
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
        <>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr] [&_code]:rounded [&_code]:border [&_code]:bg-fd-muted [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.8125rem] [&_a]:underline">
            {data.headers.slice(1).map((header, i) => (
              <Fragment key={header}>
                <dt className="text-fd-muted-foreground">{header}</dt>
                <dd
                  className="text-fd-card-foreground"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: the cell's own rendered markup, copied from this page's table
                  dangerouslySetInnerHTML={{ __html: cells[i + 1] ?? '' }}
                />
              </Fragment>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fd-muted-foreground">
            {selected.title}'s own event and field names, as the table below
            spells them — the full mapping is on the{' '}
            <Link
              href={selected.url}
              className="text-fd-primary hover:underline"
            >
              {selected.title} page
            </Link>
            .
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-fd-muted-foreground">
          This table has no row for {selected.title}.
        </p>
      )}
    </div>
  );
}
