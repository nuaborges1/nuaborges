# Refactoring Plan — Nua Borges Codebase Reorganization

**Source:** Architectural Audit & Refactoring Assessment
**Created:** 2026-10-20
**Target:** A clean, modular, domain-driven, maintainable architecture for Next.js App Router + Cloudflare Pages with 0 circular dependencies, 0 manual files > 500 lines, clear separation of concerns, and 100% preservation of all existing behavior and tests.

## Pre-flight Checks
- [x] Baseline Git status inspected (all uncommitted work preserved)
- [x] Baseline TypeScript check passed (`tsc --noEmit`)
- [x] Automated test suites baseline passed (Persistence 10/10, Security 8/8, Audit 6/6, Checkout 7/7)
- [x] Circular dependencies analyzed (3 cycles identified)
- [x] Codebase inventory taken (368 files, 49 files > 500 lines)
- [x] Relevant GitHub skills ingested and applied

## Chunk 1: Circular Dependencies & Core Session Extraction
**Why:** Eliminate cycles between `contentStore` and `lib/media` (Cycle 1) and between `app/admin/page.tsx` and admin components (Cycle 2 & 3).
**Entry criteria:** All baseline tests pass.
**Steps:**
1. Extract `getPublicApiUrl` and `getStoredSessionToken` into `@/lib/sessionToken.ts`.
2. Update `lib/media/providers/HttpApiProvider.ts` to import from `@/lib/sessionToken`.
3. Create `types/admin.ts` with `AdminTab` and admin navigation interfaces.
4. Update `app/admin/page.tsx`, `components/nua/admin/AdminHeader.tsx`, and `components/nua/admin/NotificationCenter.tsx` to import `AdminTab` from `@/types/admin`.
**Exit criteria:** `detectCycles.mjs` reports 0 cycles. `tsc --noEmit` passes. All tests pass.

## Chunk 2: Legacy Duplications & Dead Code Removal
**Why:** Eliminate redundant identical files in `lib/nua/` and orphaned copies in `components/admin/`.
**Entry criteria:** Chunk 1 verified.
**Steps:**
1. In `lib/nua/`, replace giant duplicate files (`geminiService.ts`, `generateContractPdf.ts`, `requestHeuristics.ts`) with canonical re-exports from `@/lib/*`.
2. Clean up legacy unreferenced duplicates in `components/admin/`, preserving `components/admin/index.ts` as a thin re-export compatibility layer.
**Exit criteria:** `tsc --noEmit` clean. 10/10 persistence tests pass.

## Chunk 3: Fix Baseline ESLint Errors (Pre-existing Bugs)
**Why:** Fix conditional hook execution in `AssistirClientView.tsx` and invalid ref mutation in `useAdminOrderNotifications.ts`.
**Entry criteria:** Chunk 2 verified.
**Steps:**
1. Fix hook ordering in `app/assistir/[slug]/AssistirClientView.tsx`.
2. Fix ref access in render in `hooks/useAdminOrderNotifications.ts`.
**Exit criteria:** `npm run lint` passes with 0 errors.

## Chunk 4: Decompose Tier 1 Monoliths (> 1000 Lines)
**Why:** Enforce the 500-line strict limit on the largest application monoliths.
**Entry criteria:** Chunk 3 clean.
**Target Files:**
- `components/nua/admin/AvulsosEditor.tsx` (2218 lines)
- `components/nua/admin/AppointmentsEditor.tsx` (1723 lines)
- `app/contrato/page.tsx` (1682 lines)
- `components/nua/admin/PersonalizadosEditor.tsx` (1449 lines)
- `components/nua/admin/NuaAiChatDrawer.tsx` (1289 lines)
- `components/nua/admin/LibraryEditor.tsx` (1179 lines)
- `components/nua/site/CheckoutModal.tsx` (1053 lines)
- `lib/music/store.tsx` (1012 lines)
- `components/admingeral/RequestsCenter.tsx` (997 lines)
**Exit criteria:** All decomposed files < 500 lines. `tsc --noEmit` and all tests pass.

## Chunk 5: Decompose Tier 2 Monoliths (500 to 1000 Lines)
**Why:** Complete the reduction of all manually written code files to under 500 lines.
**Target Files:**
- `app/assistir/[slug]/AssistirClientView.tsx` (912 lines)
- `components/nua/admin/CofreCredenciaisModule.tsx` (903 lines)
- `components/nua/site/MusicPlayer.tsx` (885 lines)
- `lib/contentStore.ts` (862 lines)
- `components/admingeral/FinanceAdminManager.tsx` (860 lines)
- `app/admin/page.tsx` (834 lines)
- `components/nua/admin/NuaSpotlightModal.tsx` (799 lines)
- `components/nua/admin/HeroEditor.tsx` (772 lines)
- `components/nua/admin/InstitutionalEditor.tsx` (772 lines)
- `components/nua/admin/ChannelsEditor.tsx` (766 lines)
- `components/nua/admin/ImagePickerModal.tsx` (740 lines)
- `components/nua/admin/MediaViewerModal.tsx` (732 lines)
- `functions/api/_supabaseStore.ts` (717 lines)
- `lib/geminiService.ts` (715 lines)
- `app/chamadas/page.tsx` (709 lines)
- `app/avulsos/[slug]/AvulsoProductView.tsx` (681 lines)
- `components/nua/admin/PackEditorPage.tsx` (655 lines)
- `components/nua/admin/CommercialFinanceEditor.tsx` (643 lines)
- `components/nua/admin/music/MusicLibrary.tsx` (639 lines)
- `components/nua/site/Hero.tsx` (632 lines)
- `lib/media/optimizer.ts` (631 lines)
- `app/personalizados/PersonalizadosClientView.tsx` (612 lines)
- `lib/generateContractPdf.ts` (599 lines)
- `lib/appointmentsCanonical.ts` (565 lines)
- `lib/requestHeuristics.ts` (564 lines)
- `components/nua/admin/GalleryEditor.tsx` (556 lines)
- `lib/nuaAi/knowledgeStore.ts` (547 lines)
- `components/nua/admin/FinanceEditor.tsx` (509 lines)
**Exit criteria:** All manual files in inventory <= 500 lines. `tsc --noEmit` passes.

## Chunk 6: Final Verification & Comprehensive Report
**Why:** Provide proof of complete adherence to prompt constraints.
**Steps:**
1. Re-run `detectCycles.mjs` (0 cycles).
2. Re-run `inventory.mjs` (0 files > 500 lines).
3. Re-run all test suites and lint.
4. Validate build with `next build`.
5. Write final report according to prompt structure (sections A-H).
