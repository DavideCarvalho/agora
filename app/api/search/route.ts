import { createFromSource } from 'fumadocs-core/search/server';
import { latestSource } from '@/lib/source';

export const revalidate = false;

// fumadocs-core 16.15 replaced Orama with `zbsearch`; its default `multilingual` tokenizer needs
// no `language` option and is what the client-side `staticClient` expects.
// Only the latest docs are indexed: an older major (/docs/<lib>/v0/...) would otherwise return
// every page twice.
export const { staticGET: GET } = createFromSource(latestSource);
