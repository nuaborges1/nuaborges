/* Vinho maduro / Nua Borges */

import {
  computeEditorialDiffSummaryMjs,
  polishEditorialPostMjs,
  restoreAndVerifyEditorialImagesMjs,
  runBasicDeterministicOrganizerMjs,
  tokenizeEditorialImagesMjs,
} from './polishPostCore.mjs';
import type { ParsedEditorialImageBlock } from '../editorialMarkup';

export interface PolishPostSummary {
  spellingCorrections: number;
  headingsSuggested: number;
  paragraphsStructured: number;
  highlightsApplied: number;
  imagesRepositioned: number;
}

export interface PolishPostRequest {
  text: string;
  headline?: string;
  role?: string;
  mode?: 'ai' | 'basic';
}

export interface PolishPostReportStep {
  category: string;
  title: string;
  detail: string;
}

export interface PolishPostResponse {
  ok: boolean;
  originalText: string;
  organizedText: string;
  summary: PolishPostSummary;
  highlights: string[];
  detailedReport?: PolishPostReportStep[];
  warnings: string[];
  source: 'gemini' | 'basic_organizer' | 'unavailable';
  modelUsed?: string;
  error?: {
    code: string;
    friendly: string;
  };
}

export function tokenizeEditorialImages(rawText: string): {
  tokenizedText: string;
  mediaTokens: Array<{ token: string; originalBlock: ParsedEditorialImageBlock }>;
} {
  return tokenizeEditorialImagesMjs(rawText) as any;
}

export function restoreAndVerifyEditorialImages(
  aiOutputText: string,
  mediaTokens: Array<{ token: string; originalBlock: ParsedEditorialImageBlock }>
): {
  restoredText: string;
  imagesRepositioned: number;
  warnings: string[];
} {
  return restoreAndVerifyEditorialImagesMjs(aiOutputText, mediaTokens) as any;
}

export function computeEditorialDiffSummary(
  originalText: string,
  organizedText: string,
  imagesRepositioned: number
): { summary: PolishPostSummary; highlights: string[] } {
  return computeEditorialDiffSummaryMjs(originalText, organizedText, imagesRepositioned) as any;
}

export function runBasicDeterministicOrganizer(rawText: string): {
  organizedText: string;
  imagesRepositioned: number;
} {
  return runBasicDeterministicOrganizerMjs(rawText) as any;
}

export async function polishEditorialPost(
  req: PolishPostRequest,
  env?: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string }
): Promise<PolishPostResponse> {
  return (await polishEditorialPostMjs(req, env || {})) as PolishPostResponse;
}
