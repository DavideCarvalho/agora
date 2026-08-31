'use client';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

// On GitHub Pages the exported search index lives under the repo basePath, e.g.
// `/agora/api/search`. A plain `/api/search` fetch (the default) is absolute from
// the origin root and would 404. Prefix it with the basePath injected at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function DefaultSearchDialog(props: SharedProps) {
  const { locale } = useI18n(); // (optional) for i18n
  const { search, setSearch, query } = useDocsSearch({
    // fumadocs-core 16.15 swapped the static search engine from Orama to its own `zbsearch`;
    // the default database (schema `{ _: 'string' }`, multilingual tokenizer) matches what
    // `createFromSource` exports on the server, so no custom `initDB` is needed.
    client: staticClient({
      locale,
      from: `${basePath}/api/search`,
    }),
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
