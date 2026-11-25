import { readCatalogIndex } from '@/lib/publishedSeoData';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(readCatalogIndex());
}
