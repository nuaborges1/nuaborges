export interface ContentOp {
  action: 'set' | 'append' | 'remove';
  path: string;
  value?: any;
}
export interface ContentChange {
  action: string;
  path: string;
  before: any;
  after: any;
}
/** Enxuga uma mídia da biblioteca (sem variants/data URLs). */
export function slimMediaItem(item: any): any;
/** Enxuga a biblioteca inteira preservando id, url, objectKey e tipo. */
export function slimLibrary(library: any[]): any[];
/**
 * Rascunho pronto para trafegar até o servidor: mantém `library`
 * (enxuta), nunca a remove. Substitui o antigo `compactForAi`.
 */
export function draftForAi(content: any): any;
/** @deprecated Use `draftForAi`. */
export function compactForAi(content: any): any;
/** Reconstitui a biblioteca enxuta com os campos completos locais (variants etc.). */
export function rehydrateLibrary(slim: any, full: any): any;
export function snapshotForPrompt(content: any, opts?: { maxString?: number; maxItems?: number }): any;
export function parsePath(path: string): any[] | null;
export function applyContentOps(
  content: any,
  ops: ContentOp[]
): { ok: true; content: any; changes: ContentChange[] } | { ok: false; errors: string[] };
