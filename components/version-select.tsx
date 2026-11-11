'use client';

// The per-library version dropdown (TanStack-style), shown in the sidebar under the library
// dropdown. The versions are the library's `root: 'version'` folders (see lib/versions.ts);
// picking one goes to the same page in that version when it exists, else to its landing page.

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { Check, ChevronsUpDown, History } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { getLibVersions, projectUrl, VERSION_ROOT } from '@/lib/versions';

export function VersionSelect() {
  const path = useTreePath();
  const [open, setOpen] = useState(false);

  const state = useMemo(() => {
    const versionIdx = path.findLastIndex(
      (node) => node.type === 'folder' && node.root === VERSION_ROOT,
    );
    if (versionIdx < 1) return;
    const libNode = path[versionIdx - 1];
    if (libNode.type !== 'folder') return;
    const lib = getLibVersions(libNode);
    if (!lib || lib.versions.length < 2) return;
    const current = lib.versions.find((v) => v.folder === path[versionIdx]);
    if (!current) return;
    const last = path.at(-1);
    const url = last?.type === 'page' ? last.url : undefined;
    return {
      current,
      options: lib.versions.map((v) => ({
        version: v,
        href: v === current ? (url ?? v.prefix) : projectUrl(url, current, v),
      })),
    };
  }, [path]);

  if (!state) return null;
  const { current, options } = state;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Docs version: ${current.label}`}
        className="flex w-full items-center gap-2 rounded-lg border bg-fd-secondary/50 p-2 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground"
      >
        <div className="size-9 shrink-0 md:size-5">
          <History className="size-full" />
        </div>
        <p className="text-sm font-medium">
          <span className="text-fd-muted-foreground font-normal">Version </span>
          {current.label}
        </p>
        {current.latest ? (
          <span className="rounded-md bg-fd-primary/10 px-1.5 py-0.5 text-xs font-medium text-fd-primary">
            Latest
          </span>
        ) : null}
        <ChevronsUpDown className="ms-auto size-4 shrink-0 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="fd-scroll-container flex w-(--radix-popover-trigger-width) flex-col gap-1 p-1">
        {options.map(({ version, href }) => (
          <Link
            key={version.prefix}
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <p className="text-sm font-medium leading-none">{version.label}</p>
            {version.latest ? (
              <span className="text-[0.8125rem] text-fd-muted-foreground">
                latest
              </span>
            ) : null}
            <Check
              className={cn(
                'ms-auto size-3.5 shrink-0 text-fd-primary',
                version !== current && 'invisible',
              )}
            />
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}
