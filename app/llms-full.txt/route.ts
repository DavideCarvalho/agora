import { getLLMText, latestSource } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const scan = latestSource.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}
