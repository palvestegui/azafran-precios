# Decoupled Media Architecture & Persistent Product Creation Plan

A comprehensive architectural solution to eliminate the Firestore 1 MiB document ceiling, eradicate serialization errors, and fix the draft synchronization race condition so newly created and duplicated products persist reliably without disappearing.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Decision**: In Phase 1, you confirmed the hybrid approach: **both compress and separate** catalog photos. 
> 1. Core catalog configuration (`config/system-wide-config`) retains all formulas, materials, product recipes, effort weights, and price margins, dropping from **1,043 KB to ~27 KB** (a 97% reduction).
> 2. Photos are persisted in a dedicated `/product_media/{productId}` Firestore collection, compressed using proportional bounding-box scaling.
> 3. An automatic sanitization engine recursively strips `undefined` fields prior to all Firestore writes, preventing client-side driver rejections.
> 4. `ProductsView.tsx` binds new and duplicated products synchronously to active state to prevent race-condition reverts.

---

### Non-Negotiable Technical Constraints & Acceptance Criteria

1. **Strict TypeScript (Zero `any` / Zero `@ts-ignore`)**:
   - Zero tolerance for `any` or `@ts-ignore` in new or modified files.
   - All helper functions, state hooks, Firestore payloads, and media documents must use explicit, strictly typed interfaces (`ProductMedia`, `SanitizedConfig`, `ImageDimensions`).
2. **File Budgets (Rule 300 / Rule 500)**:
   - Logic files (utilities, hooks, services): strictly under 300 lines (Rule 300).
   - Visual files (views, components, modals): strictly under 500 lines (Rule 500). Any file approaching limits must be split into modular sub-units.
3. **Natural Image Aspect Ratio Preservation**:
   - Preserve natural proportions of all uploaded images (square 1:1, portrait 4:5, vertical 9:16, landscape 16:9, or custom diptych halves).
   - Use bounding-box containment/downscaling (max width 600px, max height 900px, maintaining original aspect ratio) instead of forced center-cropping or distortive stretching.
4. **100% Schema & Formula Invariance**:
   - Zero changes to existing ingredient lists, BOM formulas, fabric consumptions, production weights, profit margins, or `variantOverrides`.
   - The decoupling of media strings must leave product data structures 100% functionally identical.

---

### 1. Overview & Core Concept

- **What It Does**: Resolves the root causes that caused newly added or cloned garments to vanish seconds after saving. Restructures data persistence so garments, fabric recipes, and costs save instantly to Firestore without hitting document payload ceilings or serialization errors.
- **Target Audience / Persona**: Workshop managers, administrators, and tailors managing recipes and garment pricing matrices for Azafrán.
- **Key Value**: Guaranteed persistence, sub-second save times, zero document size limits as the catalog scales to hundreds of garments, and clean visual feedback on every save.

---

### 2. User Experience & Visual Design

- **Zero-Friction Product Creation**:
  - Clicking `+ Prenda` or `Duplicar` immediately focuses the new garment in the sidebar and workbench without flicker or reversion to the first garment.
  - The workbench header immediately displays the sequential SKU (`PRD-0032`) and status badge `Cambios pendientes` (amber pulse) until saved, transitioning to `✓ Al día` upon save.
- **Proportional Media Display**:
  - The catalog image previews in the collapsible drawer display images in their natural aspect ratios within responsive containment frames (`object-contain` or bounded aspect ratios), avoiding unwanted cropping.
  - Dual diptych slicing splits wide images along the center seam while preserving the original aspect ratio of each side.
- **Error Boundaries & Feedback**:
  - If any network or Firestore issue occurs, an actionable notification banner surfaces explaining the issue, rather than silently reverting local state.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Decoupled Collection (`/product_media/{productId}`) vs. Single Monolithic Document**:
  - *Chosen Approach*: Decouple heavy media strings (`imageUrl`, `backImageUrl`) into individual documents in `/product_media/{productId}`.
  - *Why*: The monolithic `config/system-wide-config` document was already at 1,043,345 bytes (99.5% of the 1 MiB hard ceiling). Separating media frees 97% of the document space immediately, allowing thousands of product recipes without ever hitting size ceilings.
  - *Alternatives Considered*: Compressing images inside the monolithic document alone was evaluated, but would only defer the issue until ~60-80 products are added. Decoupling eliminates the limit permanently.
- **Decision 2: Bounding-Box Proportional Compression**:
  - *Chosen Approach*: Downscale images to fit within a 600x900 bounding box while strictly preserving natural aspect ratios, encoding to optimized JPEG/WebP (~15-25 KB).
  - *Why*: Respects tailoring photos of varying cuts, mannequins, and detail shots without cropping out collars, cuffs, or labels.
- **Decision 3: Recursive Deep Sanitization (`sanitizeForFirestore`)**:
  - *Chosen Approach*: Filter and strip all `undefined` values recursively across any object before `setDoc()`.
  - *Why*: Firestore strictly forbids `undefined` anywhere in document trees. Sanitizing at the service boundary guarantees invalid keys never crash the write stream.
- **Decision 4: Synchronous State Initialization in `ProductsView`**:
  - *Chosen Approach*: When creating or cloning a garment, immediately assign `draftProduct` and `committedProduct` directly to the new entity object, rather than querying `config.products` before React has re-rendered the parent prop.
  - *Why*: Eliminates the race condition where `target` evaluates to `null` and defaults back to the first product in the catalog.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ProductsView Workbench                          │
│  - Synchronous Draft State: draftProduct = newProduct                  │
│  - Pre-save Validation & Sequential SKU Assignment                     │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ 1. Save Product Recipe          │ 2. Save Media (Decoupled)
                   ▼                                 ▼
┌────────────────────────────────────┐    ┌──────────────────────────────┐
│  Firestore: /config/system-config  │    │ Firestore: /product_media/   │
│  - Lightweight Recipes (~27 KB)    │    │ - imageUrl (proportional)    │
│  - Materials, Insumos, Overheads   │    │ - backImageUrl (proport.)    │
│  - Sanitized (0 undefined fields)  │    │ - 1 doc per garment (15 KB)  │
└────────────────────────────────────┘    └──────────────────────────────┘
```

- **Firestore Security Rules**:
  - Add authorization for `/product_media/{productId}` to allow verified read/write access.
  - Deploy updated rules cleanly via `DeployRules` RPC.
- **Data Models**:
  - `Product`: Retains optional local references `imageUrl` and `backImageUrl` in UI state for seamless component compatibility, but strips base64 payloads from `config/system-wide-config` on write.
  - `ProductMedia`: Structured as `{ id: string, imageUrl?: string, backImageUrl?: string, updatedAt: string }`.
- **Migration & Backward Compatibility**:
  - Seamlessly migrates existing product images into `/product_media` without data loss during application bootstrap.
  - MCP tool `precios_get_bundle` and `/api/sync-to-ventas` continue to export complete garments with full resolution media as expected.
