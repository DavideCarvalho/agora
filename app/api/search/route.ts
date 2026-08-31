import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const revalidate = false;

// fumadocs-core 16.15 replaced Orama with `zbsearch`; its default `multilingual` tokenizer needs
// no `language` option and is what the client-side `staticClient` expects.
export const { staticGET: GET } = createFromSource(source);
