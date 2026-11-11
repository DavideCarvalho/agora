import { llms } from 'fumadocs-core/source';
import { latestSource } from '@/lib/source';

export const revalidate = false;

export function GET() {
  return new Response(llms(latestSource).index());
}
