export type {
  CopyMode,
  VerbalIdentityConfig,
  RouteSeoCopy,
  PublicSeoRoute,
  CmsStockOverrideKey,
  CopyFaqEntry,
  CopyCaminhoEntry,
  CopyDictionary,
} from './types';
export { ORIGINAL_COPY, STOCK_CMS_BASELINES } from './original';
export { NUA_AUTORAL_EXPERIMENTAL_COPY } from './nua-autoral.experimental';
export {
  VERBAL_IDENTITY_STORAGE_KEY,
  DEFAULT_COPY_MODE,
  normalizeCopyMode,
  normalizeVerbalIdentityConfig,
  resolveCopyDictionary,
  isStockCmsValue,
  resolveCmsText,
  normalizePublicSeoRoute,
  resolveRouteSeo,
} from './resolver';
export {
  CopyProvider,
  useCopy,
  useCopyMode,
  COPY_MODE_UPDATED_EVENT,
} from './CopyProvider';
