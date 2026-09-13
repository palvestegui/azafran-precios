# Changelog

## [Unreleased] - 2026-09-05

### Two-Way Variant Pricing Overrides, Cross-Catalog Margin Sentinel Alert, and Action Bar Layout Collision Fix
- **What failed / Business problem**:
  - *Pricing vs. Margin Inflexibility*: Market-driven garments command higher selling prices on affordable fabrics (e.g. Pantalón in Gabardina can retail for Bs 139 despite cost-plus formula calculating Bs 102). Raising global or product margins distorted other garments across the catalog. There was no mechanism to set live selling price overrides and visualize the exact resulting profit margin and net profit in Bolivianos.
  - *Silent Negative Margins (Inflation Risk)*: In volatile textile markets, whenever a fabric's cost per meter was updated in `MaterialCard`, existing fixed selling prices were at risk of silently slipping into negative profit margins (selling at a loss) without warning.
  - *CSS Layout Collision*: In `MaterialCard.tsx` and compact footers, the text "Descartar" and "Guardar Cambios" visually overlapped (`✓ GuardDescartar`) due to insufficient flexbox gap and missing `whitespace-nowrap` / `shrink-0` safeguards on smaller card widths.
- **Why it failed**:
  - The `Product` data model only supported uniform markup percentage formulas without variant-specific price overrides.
  - No automated cross-catalog audit mechanism existed when saving material price adjustments.
  - Footer flexbox children lacked explicit word-wrap and shrinking boundary rules.
- **How root architecture was adapted**:
  - **Data Model & Validation Extension (`src/types.ts`, `src/utils/validation.ts`)**:
    - Defined `VariantPriceOverride` interface (`customRetailPrice?: number; customWholesalePrice?: number`).
    - Extended `Product` interface with optional `variantOverrides?: Record<string, VariantPriceOverride>` keyed by `fabricId`.
    - Added comprehensive validation and sanitization in `validateProduct` in `src/utils/validation.ts`, ensuring invalid numbers are filtered out.
  - **Two-Way Calculation Engine (`src/components/products/ProductFabricPricingTable.tsx`)**:
    - Redesigned the "Precios Finales por Tela" table with responsive numeric inputs for **Precio Menor** and **Precio Mayor**.
    - Injected formula-derived fallback placeholders when no custom override is specified.
    - Integrated live two-way mathematical badges:
      - `realMargin = ((effectivePrice - totalCost) / effectivePrice) * 100`
      - `netProfit = effectivePrice - totalCost`
      - Color-coded: emerald for healthy margins (>= 10%), amber for critical margins (< 10%), and pulsing red with warning alert for negative margins (< 0%).
    - Added inline reset actions (`RotateCcw`) to easily revert custom overrides back to mathematical formula prices.
    - Added `onWheel={(e) => e.currentTarget.blur()}` across inputs to eliminate accidental scroll mutations.
  - **Cross-Catalog Margin Sentinel Audit (`src/utils/marginSentinel.ts`)**:
    - Created dedicated, strongly-typed audit utility (148 lines, Rule 300 compliant).
    - `checkMaterialPriceImpact(updatedMaterial, config)` simulates updated material unit costs across all products and variants.
    - Accurately audits garments with custom overrides and flags any item with negative margin (critical) or margin < 10% (warning).
  - **Sentinel Alert Modal (`src/components/materials/MarginSentinelModal.tsx`, `src/components/views/MaterialsView.tsx`)**:
    - Created high-contrast alert dialog (204 lines, Rule 500 compliant) that triggers upon saving a material if negative margins are detected.
    - Details the garment name, fabric variant, sale type (Retail vs. Wholesale), cost delta (`Bs Old → Bs New`), current fixed price, and unit deficit.
    - Offers action buttons: "Entendido / Continuar" and "Ver Prenda Afectada" (seamlessly transitioning to Products view).
  - **Action Bar Collision Fix (`src/components/common/CardDraftFooter.tsx`, `src/components/products/ProductDraftFooter.tsx`)**:
    - Updated container layouts with `gap-3`, `shrink-0`, and `flex-wrap` protection.
    - Enforced `whitespace-nowrap select-none shrink-0` across all "Descartar" and "Guardar Cambios" buttons, eliminating text collisions.
  - **Rule 300 / Rule 500 Compliance**:
    - `src/utils/marginSentinel.ts`: 148 lines (< 300).
    - `src/components/materials/MarginSentinelModal.tsx`: 204 lines (< 500).
    - `src/components/products/ProductFabricPricingTable.tsx`: 350 lines (< 500).
    - `src/components/products/ProductCard.tsx`: 440 lines (< 500).
    - `src/components/views/MaterialsView.tsx`: 199 lines (< 500).
    - Strict Type Safety: Zero `any` or `@ts-ignore` across all code.

### Universal Draft Isolation and Explicit Save/Discard Across All Application Cards and Views
- **What failed / Business problem**:
  - Across Materials (`MaterialsView.tsx`, `MaterialCard.tsx`, `AccessoryCard.tsx`), Staff (`StaffView.tsx`), Overhead (`RegularPaymentsView.tsx`, `DailyExpensesView.tsx`), and Global Parameters (`ProfitView.tsx`), numeric and textual input fields directly invoked `onChange` handlers on every keystroke.
  - As a consequence, typing a partial number (e.g. typing `1200` through `1`, `12`, `120`, `1200`) triggered multiple instantaneous writes to Firestore and LocalStorage, while immediately recomputing unit overhead, labor allocations, and pricing matrices globally.
  - Accidental user errors or typing slips immediately altered production pricing without giving the user a chance to review or discard changes.
- **Why it failed**:
  - The application originally relied on simple top-down state where child cards were controlled strictly by parent state with immediate `onChange` mutation callbacks.
  - Lack of a generic, isolated draft buffer architecture meant cards lacked independent dirty tracking and revert capabilities.
- **How root architecture was adapted**:
  - **Universal Reusable Hook (`src/hooks/useDraftState.ts`)**:
    - Created generic, strongly-typed `useDraftState<T>(initialValue, onCommit, options)` (136 lines, under 150 lines and Rule 300 compliant).
    - Features:
      - Internal deep clone of incoming entity (`draft`).
      - Deep equality engine (`deepEqual`) to accurately track pristine vs. modified state (`isDirty`) without false positives.
      - Atomic helper methods: `updateField(key, value)`, `updateDraft(mutator)`, `commit()`, and `discard()`.
      - Transient feedback management (`statusMessage`) with auto-clearing timer and optional `onNotify` integration.
  - **Standardized Action Footer Component (`src/components/common/CardDraftFooter.tsx`)**:
    - Created reusable visual footer (166 lines, Rule 500 compliant) for cards across all domains.
    - Features:
      - Active state pill: "Cambios pendientes de confirmación" (pulsing amber indicator) vs. "Sin cambios pendientes" (emerald check).
      - "Descartar" button (`RotateCcw`) reverting the local draft to parent state.
      - "Guardar Cambios" button (`Save`) with high-contrast active styling and subtle scale animations.
      - Compact mode support for dense row-based entries (staff, overhead, daily expenses).
  - **Domain Component Decoupling & Isolation**:
    - **Materials & Insumos (`src/components/materials/MaterialCard.tsx`, `AccessoryCard.tsx`, `MaterialsView.tsx`)**:
      - Encapsulated unit cost, shrinkage/wastage %, default suppliers, packaging, and extra logistics in isolated local drafts.
      - Extracted `MaterialCard` into its own modular component, reducing `MaterialsView.tsx` from 437 to 164 lines.
      - Added visual border cues: amber outline and glow when dirty.
    - **Staff / Planilla (`src/components/staff/StaffCard.tsx`, `src/components/views/StaffView.tsx`)**:
      - Created dedicated `StaffCard.tsx` (138 lines) wrapping headcount (`count`), name, role, and monthly wage in `useDraftState`.
      - Reduced `StaffView.tsx` from 155 to 103 lines.
      - Salary or headcount edits do not recalculate unit labor costs until explicitly saved.
    - **Overhead & Indirect Costs (`src/components/overhead/RegularPaymentCard.tsx`, `DailyExpenseCard.tsx`, `RegularPaymentsView.tsx`, `DailyExpensesView.tsx`)**:
      - Created `RegularPaymentCard.tsx` (124 lines) and `DailyExpenseCard.tsx` (99 lines) with draft isolation and compact footers.
      - Rent, utilities, subscriptions, and daily operational expenses stay isolated in draft until confirmed.
      - Reduced `RegularPaymentsView.tsx` to 110 lines and `DailyExpensesView.tsx` to 121 lines.
    - **Global Parameters & Margins (`src/components/views/ProfitView.tsx`)**:
      - Integrated `useDraftState<GlobalParametersDraft>` for retail margin, wholesale margin, and monthly production capacity (`productionCapacity`).
      - Sliders provide real-time visual projections in a preview mode with an amber "Vista previa con parámetros sin guardar" pill.
      - Root configuration and Firestore persistence only update upon clicking "Guardar Parámetros".
  - **Rule 300 / Rule 500 Compliance & Strict Typing**:
    - `src/hooks/useDraftState.ts`: 136 lines (< 300).
    - `src/components/common/CardDraftFooter.tsx`: 166 lines (< 500).
    - `src/components/materials/MaterialCard.tsx`: 224 lines (< 500).
    - `src/components/materials/AccessoryCard.tsx`: 392 lines (< 500).
    - `src/components/views/MaterialsView.tsx`: 164 lines (< 500).
    - `src/components/staff/StaffCard.tsx`: 138 lines (< 500).
    - `src/components/views/StaffView.tsx`: 103 lines (< 500).
    - `src/components/overhead/RegularPaymentCard.tsx`: 124 lines (< 500).
    - `src/components/views/RegularPaymentsView.tsx`: 110 lines (< 500).
    - `src/components/overhead/DailyExpenseCard.tsx`: 99 lines (< 500).
    - `src/components/views/DailyExpensesView.tsx`: 121 lines (< 500).
    - `src/components/views/ProfitView.tsx`: 462 lines (< 500).
    - Strict Type Safety: Zero `any` or `@ts-ignore` across all files.

### Filtering "Precios Finales por Tela" and "Matriz de Precios" by `product.allowedFabricIds`
- **What failed**:
  - "PRECIOS FINALES POR TELA" in `ProductCard.tsx` and the global "Matriz de Precios" (`PricingMatrixView.tsx` / `PricingMatrixTable.tsx`) displayed pricing for forbidden/unselected fabrics (e.g., Cuero on Filipinas or Gorros), calculating meaningless prices for garment-fabric combinations that will never be produced.
- **Why it failed**:
  - The local breakdown table rendered all fabrics from `config.materials` without filtering by `product.allowedFabricIds`.
  - The matrix view rendered placeholder dashes (`—`) rather than displaying an explicit `"No aplica"` state, and allowed fabrics logic in calculation did not properly treat empty restriction sets or unconfigured defaults.
- **How it was fixed**:
  - **Local Breakdown Table (`src/components/products/ProductFabricPricingTable.tsx`)**:
    - Filtered rendered rows by `product.allowedFabricIds`. If `product.allowedFabricIds` is undefined, defaults to showing all enabled fabrics.
    - If `product.allowedFabricIds` is empty or no fabrics match, renders a clear contextual empty state: *"Seleccione al menos una tela permitida arriba."*
    - Unselected fabric pills (e.g., toggling off `Cuero`) immediately disappear from the table in real time as the draft updates.
    - Added a live count indicator pill in the table header showing the number of allowed fabrics.
  - **Global Pricing Matrix (`src/components/pricing/PricingMatrixTable.tsx` & `src/utils/pricingMatrix.ts`)**:
    - Updated `calculateMatrixCell` in `pricingMatrix.ts` to strictly mark any fabric where `product.allowedFabricIds && !product.allowedFabricIds.includes(fabric.id)` as `isApplicable: false` with reason `"No aplica"`.
    - In `PricingMatrixTable.tsx`, rendered `"No aplica"` (styled in muted italic stone text) for any column where the fabric is not allowed for the product.
    - Synchronized CSV and PDF export modules (`exportMatrixToCsv`, `exportMatrixToPdf`) to output `"No aplica"` for unapplicable fabric combinations.
  - **Catalog Normalization & Fallbacks (`src/data/defaultCatalog.ts` & `src/utils/validation.ts`)**:
    - Configured operational `allowedFabricIds` across default products in `DEFAULT_GLOBAL_CONFIG` so garments like Filipina, Gorro, and Guardapolvo reflect verified atelier protocols out of the box (excluding Cuero, etc.).
    - Added fallback in `validateProduct` to inherit default allowed fabrics if legacy products load without an `allowedFabricIds` array.
- **Rule Compliance**:
  - `src/components/products/ProductFabricPricingTable.tsx`: 128 lines (< 500).
  - `src/components/pricing/PricingMatrixTable.tsx`: 303 lines (< 500).
  - `src/components/views/PricingMatrixView.tsx`: 234 lines (< 500).
  - `src/utils/pricingMatrix.ts`: 195 lines (< 300).
  - Zero `any` or `@ts-ignore`. Zero hardcoding (filtering relies strictly on `material.id` and `product.allowedFabricIds`).

### Wheel-Scroll Mutation Prevention & Explicit Save/Discard Draft State in Product Configuration
- **What failed / Business problem**:
  - **Accidental Wheel Mutation**: HTML `<input type="number">` fields across the app listened to mouse wheel scroll events. When users scrolled through views, hovering over number inputs inadvertently incremented or decremented critical financial parameters (fabric consumption, effort weights, unit costs, salaries, margins).
  - **Volatile Instant Auto-Save**: In `ProductCard.tsx`, input fields mutated the global configuration and triggered immediate Firestore / LocalStorage writes on every keystroke (`onChange`), risking corrupted drafts and unconfirmed persistence of incomplete edits.
- **Why it failed**:
  - Default browser behavior for focused or hovered number inputs handles mouse wheel ticks as increment/decrement steps unless explicitly blurred or intercepted.
  - `ProductCard.tsx` directly invoked `onUpdateProduct` upon `onChange` without an intermediate buffer or dirty-state verification.
- **How root architecture was adapted**:
  - **Dedicated Draft Hook (`src/hooks/useProductDraft.ts`)**:
    - Created an encapsulated, testable hook (`useProductDraft.ts`, 202 lines, adhering to Rule 300) to decouple active editing from root persistence.
    - Deep-clones initial product data and maintains local `draftProduct` state.
    - Tracks deep equality with parent state using robust dirty checking (`isDirty`).
    - Provides atomic methods: `updateDraft`, `addIngredient`, `updateIngredient`, `removeIngredient`, `saveDraft`, and `discardDraft`.
    - Coordinates notifications via `onNotify` and transient status indicators.
  - **Component Decoupling & Line Limit Compliance (`src/components/products/`)**:
    - Extracted comparative fabric table into `ProductFabricPricingTable.tsx` (102 lines).
    - Extracted sticky action bar into `ProductDraftFooter.tsx` (77 lines).
    - Reduced `ProductCard.tsx` from 552 to 418 lines (Rule 500 compliant).
    - Added high-contrast sticky bottom action bar displaying "Guardar Cambios" (with active orange glow when dirty) and "Descartar" (reverting all local mutations).
    - Displays clear state pill: *"Cambios pendientes de confirmación"* (pulsing amber) vs *"Al día con el catálogo"* (emerald checkmark).
  - **Global & Local Mouse Wheel Blur Prevention**:
    - Added `onWheel={(e) => e.currentTarget.blur()}` across every single `type="number"` input in the codebase:
      - `ProductCard.tsx` (effort weight, fabric meters, insumo quantities)
      - `AccessoryCard.tsx` (unit cost, batch size, extra logistics costs, margins)
      - `MaterialsView.tsx` (unit costs, wastage percentages, override margins, batch sizes)
      - `RegularPaymentsView.tsx` (payment amounts)
      - `DailyExpensesView.tsx` (daily expense amounts)
      - `StaffView.tsx` (staff headcount, monthly salaries)
      - `MarginCalculatorCard.tsx` (custom retail and wholesale simulator prices)
      - `DashboardControls.tsx` (order accessory quantities)
      - `PricingMatrixTable.tsx` (inline fabric consumption editor)
    - Added a global passive window listener in `App.tsx` that automatically blurs any active number input on wheel scroll as an infallible safety net.
- **Rule Compliance**:
  - `src/hooks/useProductDraft.ts`: 202 lines (< 300).
  - `src/components/products/ProductCard.tsx`: 418 lines (< 500).
  - `src/components/products/ProductFabricPricingTable.tsx`: 102 lines (< 500).
  - `src/components/products/ProductDraftFooter.tsx`: 77 lines (< 500).
  - Zero `any` types or `@ts-ignore`. All external contracts validated.

### Proportional Labor & Overhead Allocation via `productionWeight`
- **What failed / Business problem**:
  - The pricing engine previously allocated a flat, equal share of monthly workshop overhead and labor (`(regularPayments + dailyExpenses + staff) / productionCapacity`) across every garment model regardless of tailoring complexity or assembly time.
  - Fast-production garments (e.g., Gorros, produced at 20 units/day vs Filipinas at 5 units/day) absorbed the same fixed overhead and staff costs as complex jackets, distorting prices and inflating Gorros from a market benchmark of Bs 35 to over Bs 90.
- **Why it failed**:
  - The data model lacked an effort/complexity weight factor per product to scale indirect unit allocations.
  - Calculation logic divided monthly costs by capacity without weighting for relative workshop bench time.
- **How root architecture was adapted**:
  - **Data Model (`src/types.ts`)**:
    - Added optional `productionWeight?: number` to `Product` interface representing the relative workshop effort/time ratio compared to a base garment (Filipina = 1.0, Pantalón = 0.8, Mandil = 0.5, Gorro = 0.25).
  - **Modular Pricing Engine (`src/utils/pricingCalculator.ts`)**:
    - Extracted pricing calculations into `src/utils/pricingCalculator.ts` (181 lines, adhering to Rule 300).
    - In `calculateProductAnalysis`, retrieved `productionWeight` with a safe positive fallback of `1.0`.
    - Scaled both `laborAllocation` and `overheadAllocation` proportionally by `weight`:
      - `laborAllocation = (monthlyStaff / productionCapacity) * weight`
      - `overheadAllocation = (totalOverheadExcludingLabor / productionCapacity) * weight`
    - Re-exported functions from `src/utils/calculations.ts` (reduced from 291 to 157 lines) for seamless backwards compatibility.
  - **Validation & Runtime Normalization (`src/utils/validation.ts`)**:
    - Updated `validateProduct` to validate and normalize `productionWeight` to `1.0` if undefined, missing, non-numeric, or `<= 0`.
    - Integrated fallback to `DEFAULT_GLOBAL_CONFIG` defaults to ensure legacy stored configurations and imported backups load cleanly without schema errors or NaN calculations.
  - **Default Catalog Data (`src/data/defaultCatalog.ts`)**:
    - Populated realistic operational weights across all baseline catalog products:
      - `Filipina`: 1.0, `Guardapolvo`: 1.0, `Camisa (hospitalar)`: 1.0, `Camisa (servicio)`: 1.0.
      - `Pantalón`: 0.8.
      - `Delantal`: 0.5, `Mandil`: 0.5.
      - `Gorro`: 0.25.
  - **Garment Configuration UI (`src/components/products/ProductCard.tsx`)**:
    - Added dedicated workshop effort card with numeric input for "Factor de Confección / Equivalencia de Esfuerzo".
    - Enforced constraints: `type="number"`, `step="0.05"`, `min="0.1"`, `max="3.0"`, default `1.0`.
    - Added helper text: *"Proporción de tiempo frente a una Filipina (1.0 = Filipina, 0.5 = Mandil, 0.25 = Gorro)"*.
    - Wired new product creation in `ProductsView.tsx` to initialize `productionWeight: 1.0`.
    - Updated pricing matrix formula footnote in `PricingMatrixView.tsx` to reflect the proportional factor.
- **Rule Compliance**:
  - `src/utils/pricingCalculator.ts`: 181 lines (< 300).
  - `src/utils/calculations.ts`: 157 lines (< 300).
  - `src/utils/validation.ts`: 281 lines (< 300).
  - `src/components/products/ProductCard.tsx`: 456 lines (< 500).
  - Zero `any` types or `@ts-ignore` statements. Full `tsc --noEmit` and production build pass cleanly.

### Granular Catalog Metrics & Full Backup Scope Clarification
- **What failed**:
  - The JSON download button in the "Centro de Respaldo y Seguridad" modal read `DESCARGAR RESPALDO JSON (8 PRODUCTOS)`, and the catalog metrics card displayed a coarse metric (`29 Materiales cargados | 8 Productos activos`).
  - This misled the user into thinking that only the 8 garments were being serialized into the backup, or that insumos, fabrics, and accessories were not part of the backup process.
- **Why it failed**:
  - The UI button label was bound solely to `productsCount` (`config.products.length`) rather than reflecting the complete `GlobalConfig` payload.
  - The metrics summary did not break down the `config.materials` collection by its category discriminator (`fabric`, `other`, `accessory` / `service`).
- **How it was fixed**:
  - **Deconstructed Catalog Metrics (`src/components/modals/BackupModal.tsx`)**:
    - Computed category-specific tallies: `telasCount` (`category === 'fabric'`), `insumosCount` (`category === 'other'`), `accesoriosCount` (`category === 'accessory' || category === 'service'`), and `productosCount` (`config.products.length`).
    - Derived total backup item tally: `totalItems = config.materials.length + config.products.length`.
  - **Rebuilt Metrics Breakdown Card**:
    - Added a structured 4-stat grid displaying distinct counts for **Telas**, **Insumos**, **Accesorios / Servicios**, and **Productos**, with clear visual hierarchy and total item count indicator.
  - **Clarified Export Button Label & Subtext**:
    - Upgraded button label to `DESCARGAR RESPALDO COMPLETO JSON (${totalItems} ÍTEMS)`.
    - Added an explanatory subtitle: `(${config.materials.length} Materiales, Insumos y Accesorios + ${productosCount} Productos)`.
  - **Granular Restore Feedback**:
    - Updated file import confirmation banner in `BackupModal.tsx` and toast notification in `src/App.tsx` to read:
      `¡Respaldo restaurado con éxito! (${telasCount} telas, ${insumosCount} insumos, ${accesoriosCount} accesorios, ${productosCount} productos)`.
- **Rule Compliance**:
  - `src/components/modals/BackupModal.tsx`: 335 lines (well below 500 line visual limit).
  - `src/App.tsx`: 457 lines (well below 500 line visual limit).
  - Strict type safety with 0 `any` or `@ts-ignore` statements. Full build and linter pass cleanly.

## [Unreleased] - 2026-09-04

### Direct Client-Side PDF Generation for Pricing Matrix
- **Problem Resolution**:
  - Addressed iframe sandbox restrictions in Google AI Studio that block native `window.print()`, which previously caused the `[Imprimir / PDF]` button to fail silently.
- **Client-Side Vector PDF Architecture (`src/utils/matrixPdfExport.ts`)**:
  - Integrated `jspdf` and `jspdf-autotable` to generate clean, high-resolution vector PDF documents directly in the browser with zero backend dependencies.
  - Generates downloadable PDF files titled `azafran_matriz_precios_[mode]_[YYYY-MM-DD].pdf` (e.g. `azafran_matriz_precios_combined_2026-09-04.pdf`).
  - **Landscape Layout & Theming**:
    - Orientation: Landscape A4.
    - Header: Prominent `"AZAFRÁN CHEFWEAR | Matriz de Precios Operativa"` title, active mode indicator (`Minorista`, `Mayorista`, or `Combinada`), localized generation timestamp, and an orange accent divider.
    - Table Grid: Full matrix rendering all active garments (rows) vs all operational fabrics (columns) with striped alternating rows, distinct header blocks, and strict cell formatting (`Bs 0.00` or `—`).
    - Footer: Multi-page footer stamping `"Azafrán Chefwear - Documento Operativo Interno"` and dynamic page counters (`Página X de Y`).
- **UI Integration (`src/components/views/PricingMatrixView.tsx`)**:
  - Wired `[Imprimir / PDF]` button directly to `exportMatrixToPdf`.
  - Added real-time confirmation feedback toast upon PDF download.
- **Rule Compliance**:
  - `src/utils/matrixPdfExport.ts` (178 lines < 300 line limit).
  - `src/components/views/PricingMatrixView.tsx` (234 lines < 500 line limit).
  - Zero `any` types or `@ts-ignore` directives. Full `tsc --noEmit` and production build pass.

### Navigation Bar Refactoring & Security Modal Centralization
- **Top Navigation Bar Cleanup (`src/App.tsx`)**:
  - Removed separate "Exportar Respaldo (JSON)" and "Importar Respaldo (JSON)" buttons and hidden file inputs from the top header to eliminate visual clutter.
  - Streamlined the right side of the navbar to strictly contain:
    - `[🛡️]` Centro de Respaldo y Seguridad button.
    - User profile avatar.
    - Logout exit icon.
  - Restructured left navigation into 4 primary views and 1 grouped administrative dropdown:
    - Primary view tabs: `[Resumen]`, `[📊 Matriz de Precios]`, `[Materiales]`, `[Productos]`.
    - Grouped administrative dropdown: `[💼 Costos & Finanzas ▾]` containing `Pagos Regulares`, `Gastos Diarios`, `Planilla`, and `Rentabilidad`.
  - Added active highlighting to `[Costos & Finanzas]` when any of its child views are selected.
  - Implemented outside-click and `Escape` key handlers for reliable dropdown UX.
  - Enforced `overflow: visible` on the navbar header, parent containers, and navigation pill container to prevent dropdown clipping and eliminate unwanted horizontal scrollbars.
- **Upgraded Operational Health & Backup Modal (`src/components/modals/BackupModal.tsx`)**:
  - Introduced an Operational Health Status Panel situated directly above the action buttons:
    1. **Connection Health**: Live status indicator displaying green `"Cloud Firestore Conectado"` when online and authenticated, or amber `"Modo Local / Offline Fallback"` when disconnected.
    2. **Persistence Audit**: Real-time status verifying `azafran_backup_config` synchronization with `localStorage` and `defaultCatalog.ts`.
    3. **Catalog Metrics & Backup Timestamp**: Dynamic metric strip displaying total loaded materials count and active products count alongside formatted timestamp of the last recorded JSON backup (`azafran_last_backup_timestamp`).
    4. **Action Buttons**: Preserved one-click JSON export and JSON restore workflows with immediate local timestamp updates and toast feedback.
- **Rule Compliance**:
  - Both modified visual files adhere strictly to Rule 300/500 line limits (`src/App.tsx`: 446 lines; `src/components/modals/BackupModal.tsx`: 276 lines).
  - Zero `any` types or `@ts-ignore` statements.
  - Passes full `lint_applet` and `compile_applet` with clean production compilation.

### Dedicated "MATRIZ DE PRECIOS" Cross-Garment Pricing Engine
- **Cross-Pricing Matrix View & Architecture (`src/components/views/PricingMatrixView.tsx`, `App.tsx`)**:
  - Added the new navigation tab **[📊 MATRIZ DE PRECIOS]** to the top navigation header alongside Resumen, Materiales, Productos, and Pagos Regulares.
  - Implemented `PricingMatrixView` adhering strictly to Rule 300/500 (227 lines). Features real-time KPI indicator strips (Prendas Activas, Telas Operativas, Margen Minorista Base, Margen Mayorista Base) and transparent pricing formula cards.
- **Dynamic Matrix Table Engine (`src/components/pricing/PricingMatrixTable.tsx`, `src/utils/pricingMatrix.ts`)**:
  - Matrix Structure:
    - **Y-Axis (Rows)**: All active garments/products (Filipina, Pantalón, Mandil, Delantal, Camisa de servicio, Camisa hospitalar, Gorro, Guardapolvo).
    - **X-Axis (Columns)**: All active operational fabrics (Camisería Mix, Cristal Camisero, Popelina Office, Ultra Hospitalar, Tela Tornado, Tela Bull Denim, Tela Drill 8oz, Tela Drill 6oz, Gabardina 1ra, Gabardina 2da, Cuero).
  - Dual-Axis Sticky UX:
    - Implemented a sticky first column (`Prenda / Confección`) with subtle elevated box-shadow and a sticky header row for seamless horizontal and vertical scrolling.
    - Integrated inline consumption editor (`Scissors` badge) allowing users to inspect and adjust garment fabric meterage (`fabricQuantity`) directly in the table.
  - 3-Mode View Switcher (Pill Toggle):
    1. **Vista Minorista**: Calculates and renders unit retail price based on root retail margin (`profitMargin`).
    2. **Vista Mayorista**: Calculates and renders unit wholesale price based on wholesale margin (`wholesaleMargin`).
    3. **Vista Combinada**: Displays stacked Minorista / Mayorista prices (e.g. `Bs 220 / Bs 198`) with clear visual distinction.
  - Dynamic Calculation Engine Integration:
    - Every matrix cell routes through `calculateProductAnalysis` in `src/utils/calculations.ts`, computing Fabric Cost (`Metros × Precio/m × (1 + Merma)`), Notions Cost (recipe ingredient sum with unit conversions), Labor and Overhead allocation (`(Pagos Fijos + Gastos Diarios + Planilla) / Capacidad`), and margin-adjusted pricing floor.
    - Gracefully handles fabric permission filtering (`allowedFabricIds`) and unconfigured garment consumption, rendering a clean `" — "` (No aplica) with explanatory title tooltip.
  - Real-time Cost Inspector:
    - Interactive inspection panel displays an itemized cost floor breakdown (Tela, Avíos, Mano de obra, Costos fijos, Costo Piso, Utilidad y Precios sugeridos) on cell hover.
  - Export & Print Actions:
    - Clean CSV export (`exportMatrixToCsv`) with UTF-8 BOM encoding for seamless opening in Microsoft Excel.
    - One-click print / PDF generation with dedicated `@media print` CSS layout styles.
- **Verification & Rule Compliance**:
  - Full adherence to Rule 300/500 line limits across all files (`PricingMatrixTable.tsx` 302 lines, `PricingMatrixView.tsx` 227 lines, `pricingMatrix.ts` 196 lines).
  - Zero `any` types or `@ts-ignore` directives.
  - Passes full `lint_applet` (`tsc --noEmit`) and `compile_applet` builds with zero errors.
- **Static Code Fallback Engine (`src/data/defaultCatalog.ts`)**:
  - Exported the complete verified operational baseline as `DEFAULT_GLOBAL_CONFIG`:
    - All 27 verified materials (11 fabrics including Camisería Mix @ Bs 44, Cristal Camisero @ Bs 48, Popelina Office @ Bs 52, Ultra Hospitalar @ Bs 52, Tela Tornado @ Bs 65; 16 notions, accessories, and embroidery services).
    - 8 verified products (Guardapolvo, Camisa hospitalar, Delantal, Mandil with recipe, Gorro, Pantalón, Filipina, Camisa servicio).
    - Verified fixed regular payments (IA Bs 200, Alquiler Bs 0, Luz Bs 20, Agua Bs 10, Internet Bs 140).
    - Daily operating expenses (Pasajes Bs 20/day, Megas Bs 3/day).
    - Complete executive payroll (Doris CEO Bs 1,200, Matias CSO Bs 1,000, León COO Bs 600, Pablo CMTO Bs 600).
    - Margin & capacity constants (35% retail, 20% wholesale, 100 capacity).
  - Replaced all generic or mock placeholders in `firebaseService.ts` and `App.tsx` with this immutable static code fallback. If Firestore or local cache is empty or disconnects, the system self-heals immediately to `DEFAULT_GLOBAL_CONFIG`.
- **One-Click Backup & Restore Utility in UI Header (`src/utils/backupUtils.ts`, `App.tsx`, `BackupModal.tsx`)**:
  - Created modular utility engine `src/utils/backupUtils.ts` (Rule 300 compliant) with strict runtime schema validation and standardized date formatting (`azafran_config_[YYYY-MM-DD].json`).
  - Added **"Exportar Respaldo (JSON)"** button in the top navigation header: Generates and downloads the full active system configuration directly to the user's computer.
  - Added **"Importar Respaldo (JSON)"** button in the top navigation header: Enables instant local JSON file upload, verifies and normalizes the payload, commits it immediately to Cloud Firestore and browser `localStorage`, and updates active application state with feedback notifications.
  - Updated `BackupModal.tsx` to utilize the unified backup utility functions.

### Materials Catalog Modernization & Operational Dataset Persistence
- **Verified Operational Materials Catalog Ingestion (`firebaseService.ts`, `App.tsx`)**:
  - Replaced all legacy material definitions with the exact verified operational array:
    - **11 Fabrics**:
      - `mat-camiseria-mix`: Camisería Mix (Bs 44/m, 5% wastage)
      - `mat-cristal-camisero`: Cristal Camisero (Bs 48/m, 5% wastage)
      - `mat-popelina-office`: Popelina Office (Bs 52/m, 5% wastage)
      - `mat-ultra-hospitalar`: Ultra Hospitalar (Bs 52/m, 5% wastage)
      - `mat-tela-tornado`: Tela Tornado (Bs 65/m, 5% wastage)
      - `mat-tela-bull-denim`: Tela Bull Denim (Bs 110/m, 5% wastage)
      - `mat-tela-drill-8oz`: Tela Drill 8oz (Bs 64/m, 5% wastage)
      - `mat-tela-drill-6oz`: Tela Drill 6oz (Bs 66/m, 5% wastage)
      - `mat-caqui-1ra`: Gabardina / Caqui 1ra (Bs 55/m, 3% wastage)
      - `mat-caqui-2da`: Gabardina / Caqui 2da (Bs 40/m, 3% wastage)
      - `mat-cuero`: Cuero (Bs 90/m, 10% wastage)
    - **16 Notions, Accessories & Specialized Services**:
      - Hilo (Bs 25/spool, other)
      - Ojalillos (Bs 15/dozen, accessory)
      - Mosquetones (Bs 30/dozen, accessory)
      - Broches (Bs 20/dozen, other)
      - Argollas chicas (Bs 5/dozen, accessory), medianas (Bs 8/dozen, accessory), grandes (Bs 12/dozen, accessory)
      - Hebillas plástico S (Bs 2/unit), M (Bs 3.5/unit), L (Bs 5/unit)
      - Hebillas metálicas S (Bs 5/unit), M (Bs 8/unit), L (Bs 12/unit)
      - Remaches (Bs 25/100pack, accessory)
      - Bordado logo (Bs 60/batch, batch size 6, 35% retail margin, 20% wholesale margin)
      - Bordado nombre (Bs 15/service, 35% retail margin, 20% wholesale margin)
- **Zero-Clobber Smart Catalog Migration (`App.tsx`)**:
  - Implemented non-destructive catalog reconciliation: verifies existence of the verified dataset (`mat-camiseria-mix` and updated `mat-tela-tornado` pricing).
  - Automatically commits the upgraded catalog to both `azafran_backup_config` (`localStorage`) and Cloud Firestore, while strictly preserving all custom user product recipes, payroll, regular payments, and daily expenses.
  - Subsequent user modifications to materials and products remain fully editable and persistent.

### Elimination of Destructive Auto-Overwrite Logic (`App.tsx`)
- **Root Cause of Data Loss**: In the previous step, an automated check was added that forced `saveGlobalConfig(DEFAULT_CONFIG)` whenever the remote Firestore document did not match an exact subset of data. This inadvertently overwrote customized database records and active browser `localStorage` snapshots with the earlier baseline skeleton configuration.
- **Remediation**:
  - Removed all unconditional startup overwrite calls from `src/App.tsx`.
  - `App.tsx` now purely loads whatever state is returned by Cloud Firestore or stored in `localStorage`, never clobbering existing collections.
  - Preserved the full suite of modular components, batch pricing, fabric overrides, and backup utilities developed yesterday.

### Operational Dataset Repopulation & System Calibration
- **Verified Operational Dataset Ingestion (`firebaseService.ts` & `App.tsx`)**:
  - Populated root system configuration with verified operational records, eliminating default and placeholder values:
    - **8 Core Products**: "Guardapolvo", "Camisa (hospitalar)", "Delantal", "Mandil" (configured with `fabricQuantity: 1.2`, `defaultFabricId: 'mat-tela-tornado'`, and ingredients: `[Hebillas plástico M x 2, Hebillas plástico S x 1, Hilo x 0.05]`), "Gorro", "Pantalón", "Filipina", and "Camisa (servicio)".
    - **Fixed Regular Payments**: IA (Bs 200/mo), Alquiler Taller (Bs 0/mo), Luz (Bs 20/mo), Agua (Bs 10/mo), Internet (Bs 140/mo). Eliminated placeholder amortizaciones.
    - **Daily Operating Expenses**: Pasajes (Bs 20/day) and Megas / Crédito (Bs 3/day) across standard 22-day working month. Eliminated placeholder personal meals.
    - **Executive & Operational Payroll**: Doris (CEO: Bs 1,200), Matias (CSO: Bs 1,000), León (COO: Bs 600), Pablo (CMTO: Bs 600). Removed generic placeholders ("Costurero Principal", "Ayudante").
    - **Global Parameters**: Production Capacity set to 100 units/mo, Default Retail Margin calibrated to 35%, Wholesale Margin calibrated to 20%.
    - **Fabric Architecture**: Introduced "Tela Tornado" (`category: 'fabric'`, `unit: 'm'`, `pricePerUnit: 35.00`) directly linked to the Mandil product recipe.
- **Startup Synchronization & Self-Healing Pipeline (`App.tsx`)**:
  - Implemented automatic check on Firestore sync listener. If remote database contains outdated placeholders or lacks the verified operational dataset, the system commits the full operational dataset immediately to Cloud Firestore and browser `localStorage` (`azafran_backup_config`).
  - Synchronous `localStorage` state initialization ensures immediate rendering without layout shift or empty data states.

### Product Persistence Recovery & Default Overwrite Prevention
- **Root Cause Analysis (Why Products Were Replaced by "Mandil Clásico")**:
  - *Unsolicited Reseeding in Validator (`validation.ts`)*: `validateAndNormalizeGlobalConfig` contained `products: products.length > 0 ? products : fallback.products`. When the user deleted "Mandil Clásico", leaving 0 products or preparing to add their own, the validation engine evaluated `products.length > 0` as `false` and forcibly re-injected `fallback.products` (which contained `"Mandil Clásico"`).
  - *Offline Transport Disconnect & Overwrite*: Prior to the connection repair, the browser was encountering `@firebase/firestore: Could not reach Cloud Firestore backend. Backend didn't respond within 10 seconds`. Products entered during this disconnected state were never committed to Cloud Firestore. When the connection was fixed, the newly reachable cloud document was empty (`snapshot.exists() === false`), triggering `saveGlobalConfig(DEFAULT_CONFIG)`, which committed the default template with "Mandil Clásico" to the server.
- **Architectural Remediations**:
  - *Array Preservation in Validation (`src/utils/validation.ts`)*: Replaced length-based fallbacks with array checks (`Array.isArray(raw.products) ? products : fallback.products`). Empty arrays are now respected as valid states across all collections (`products`, `materials`, `regularPayments`, `dailyExpenses`, `staff`).
  - *Seed Sanitization (`src/services/firebaseService.ts`)*: Removed `"Mandil Clásico"` from `DEFAULT_CONFIG.products` (now `[]`). The system will never re-inject this item. Removed erroneous `testConnection()` call.
  - *Local Persistence & Recovery Engine (`src/App.tsx`)*: Added continuous dual-layer synchronization with `localStorage` (`azafran_backup_config`). On document load, if the remote document is empty or only contains the legacy default, the system checks for and restores user products from local cache.
  - *JSON Backup & Restore Suite (`src/components/modals/BackupModal.tsx`)*: Built a dedicated backup and recovery modal allowing users to export their entire configuration as a JSON file and restore it on demand, ensuring complete data ownership and peace of mind.

### Firestore Initialization & Connection Repair
- **Transport Realignment (`firebaseService.ts`)**:
  - Replaced `initializeFirestore(app, { experimentalForceLongPolling: true }, ...)` with standard `getFirestore(app, firebaseConfig.firestoreDatabaseId)` as specified in the Firebase integration specification.
  - Resolved the 10-second backend timeout error (`Could not reach Cloud Firestore backend. Backend didn't respond within 10 seconds`) caused by long-polling stream buffering in browser proxy/iframe environments.
  - Verified `testConnection()` successfully resolves connectivity directly against the user database (`ai-studio-fa1e6918-be9a-4562-bfc7-e531579774e7`), eliminating the false-positive `"Please check your Firebase configuration"` error log.
  - Redeployed latest `firestore.rules` via `deploy_firebase`.

## [Unreleased] - 2026-09-03

### Accessory Margin Decoupling & Fabric-Level Margin Resolution Hierarchy
- **Accessory Margin Decoupling (`AccessoryCard.tsx`)**:
  - Decoupled `retailMargin` and `wholesaleMargin` inputs from the `isSoldSeparately` checkbox. Margins are now permanently visible, editable, and honored across all accessory and service configurations.
  - Provided clean fallbacks defaulting to `DEFAULT_RETAIL_MARGIN` (35%) and `DEFAULT_WHOLESALE_MARGIN` (20%) when values are not explicitly defined.
  - Maintained the `isSoldSeparately` checkbox purely for independent catalog visibility in quotes and catalogs without disabling margin economics.
  - Extracted the in-situ batch quote simulator preview into `src/components/materials/AccessoryBatchSimulator.tsx` (88 lines), reducing `AccessoryCard.tsx` from 405 lines to 339 lines (providing 161 lines of headroom below the 500-line visual limit).

- **Fabric-Level Margin Override Hierarchy (`calculations.ts` & `MaterialsView.tsx`)**:
  - Implemented 3-tier margin resolution hierarchy in `calculateProductAnalysis`:
    1. **Active Selected Fabric Override**: If the active fabric (`overrideFabricId` ?? `prod.defaultFabricId`) defines a custom margin (`fabric.retailMargin` / `fabric.wholesaleMargin`), it overrides all higher layers.
    2. **Garment/Product Override**: Else if the garment (`Product.profitMargin` / `Product.wholesaleMargin`) defines a custom margin, it is utilized.
    3. **System Default Floor**: Else fall back to `config.profitMargin` / `DEFAULT_RETAIL_MARGIN` (35% retail) and `config.wholesaleMargin` / `DEFAULT_WHOLESALE_MARGIN` (20% wholesale).
  - Enhanced `src/components/views/MaterialsView.tsx` with fabric-level margin inputs for `Margen Menor (%)` and `Margen Mayor (%)`, complete with dynamic inheritance placeholders (`Heredado (35%)`) and an active `Override` indicator badge.
  - Automatically activates higher margins in multi-fabric quote tables (e.g. `ProductCard.tsx`) when premium fabrics are selected.

- **Strict Type Safety & Boundary Validation (`validation.ts` & `types.ts`)**:
  - Documented `Material.retailMargin` and `Material.wholesaleMargin` interfaces in `src/types.ts` for fabrics, accessories, and services.
  - Refined `validateMaterial` and `validateProduct` in `src/utils/validation.ts` to cleanly parse optional numeric inputs without inadvertently forcing default fallback numbers when fields are cleared or left undefined, ensuring proper inheritance flow.

- **Rule 300/500 Logical Headroom Preservation**:
  - Shifted overhead aggregator helpers (`calculateMonthlyStaff`, `calculateTotalOverhead`) to `src/utils/conversions.ts` (94 lines) and re-exported them through `calculations.ts` (290 lines), preserving full backwards compatibility while keeping `calculations.ts` well beneath the 300-line logical boundary.

### Margin Floor Realignment & Rule 300/500 Headroom Enforcement
- **Default Retail Margin Reset (35%)**:
  - Reset root constant `DEFAULT_RETAIL_MARGIN = 35` in `src/utils/calculations.ts` to preserve standard 35% retail gross margin floor.
  - Aligned `DEFAULT_CONFIG.profitMargin: 35` in `src/services/firebaseService.ts` to guarantee system initialization at 35%.
  - Synchronized `ProfitView` risk coverage target with `DEFAULT_RETAIL_MARGIN`.

- **Visual Headroom Modularization (`DashboardView.tsx` -> `DashboardControls.tsx`)**:
  - Extracted the simulator filter bar and configuration controls into `src/components/dashboard/DashboardControls.tsx` (289 lines).
  - Encapsulated `DashboardControls` (Product & Fabric simulator selectors), `AccessoryFilterBar` (accessory selection chips), and `AccessoryConfigCard` (item-level batch pricing and quantity controls).
  - Reduced `src/components/views/DashboardView.tsx` from 490 lines to 280 lines (far surpassing the < 380 lines target and providing 220 lines of headroom below the 500-line visual limit).

- **Logical Headroom Modularization (`calculations.ts` -> `conversions.ts`)**:
  - Created dedicated `src/utils/conversions.ts` (76 lines) containing period normalization helpers (`calculateMonthlyRegular`, `calculateMonthlyDaily`), calendar constants (`WORKING_DAYS_PER_MONTH = 22`), and unit scaling helpers (`getUnitMultiplier`, `convertUnitCost`).
  - Streamlined `src/utils/calculations.ts` from 300 lines down to 258 lines (providing 42 lines of headroom below the 300-line logical ceiling).
  - Re-exported conversion utilities from `calculations.ts` to preserve backwards compatibility across all consumers.

### Architectural Refactor & Compliance Remediation (Rule 300/500 & Strict Type Safety)
- **God-File Modularization (`src/App.tsx`)**:
  - Decomposed `src/App.tsx` from 2,678 lines down to 256 lines (a ~90% reduction), satisfying the Visual File limit (< 500 lines).
  - Extracted domain views into standalone components:
    - `src/components/views/DashboardView.tsx` (490 lines)
    - `src/components/views/MaterialsView.tsx` (283 lines)
    - `src/components/views/ProductsView.tsx` (232 lines)
    - `src/components/views/RegularPaymentsView.tsx` (153 lines)
    - `src/components/views/DailyExpensesView.tsx` (137 lines)
    - `src/components/views/StaffView.tsx` (152 lines)
    - `src/components/views/ProfitView.tsx` (320 lines)
  - Modularized child visual components:
    - `src/components/dashboard/MarginCalculatorCard.tsx` (144 lines)
    - `src/components/dashboard/CombinedQuoteCard.tsx` (122 lines)
    - `src/components/materials/AccessoryCard.tsx` (404 lines)
    - `src/components/products/ProductCard.tsx` (421 lines)
  - Result: 100% of visual files strictly adhere to the < 500 lines boundary, and 100% of logical files adhere to the < 300 lines boundary.

- **Runtime Boundary Validation Engine (`src/utils/validation.ts`)**:
  - Created a dedicated 228-line runtime schema validation and sanitization engine with zero dependencies on unsafe casting.
  - Implemented `validateAndNormalizeGlobalConfig`, `validateMaterial`, `validateProduct`, `validateExpense`, `validateDailyExpense`, and `validateStaff`.
  - Added type guard functions (`isUnit`, `isPaymentPeriod`, `isMaterialCategory`, `isOriginType`).
  - Hardened `src/services/firebaseService.ts` to pass raw Firestore snapshot data through `validateAndNormalizeGlobalConfig` before dispatching to application state, guaranteeing null-safety and structural integrity.

- **Zero Unsafe Assertions & Strict Type Safety**:
  - Eliminated all naked `as Unit` and `as PaymentPeriod` casts in UI event handlers (`AccessoryCard`, `MaterialsView`, `RegularPaymentsView`), routing selections through type guard predicates.
  - Enforced zero usage of `any`, `unknown` without type narrowing, `@ts-ignore`, or `@ts-expect-error` across the entire codebase.

- **Centralized Business Rules & Calculation Engine (`src/utils/calculations.ts`)**:
  - Added centralized calculation helper `calculateProfitAndMargin` to eliminate redundant inline margin formulas.
  - Defined system-wide business constants: `WORKING_DAYS_PER_MONTH = 22`, `DEFAULT_RETAIL_MARGIN = 30`, `DEFAULT_WHOLESALE_MARGIN = 20`.
  - Enforced line-limit compliance (< 300 lines) on `calculations.ts`.

- **Firestore Blueprint & Security Rules Hardening**:
  - Updated `firebase-blueprint.json` to match current entity structures, including `batch` unit support, `batchSize`, and tiered accessory fields.
  - Updated `firestore.rules` validation logic to strictly enforce list integrity and field constraints, successfully verified and deployed.

### Added
- **Modular Calculation Engine (`src/utils/calculations.ts`)**:
  - Decoupled all costing, overhead amortization, bill-of-materials traversal, batch stepped pricing, and margin calculations into a dedicated, unminified, strictly typed engine (`src/utils/calculations.ts`).
  - Enforced Rule 300/500 compliance for core business logic and enabled modular auditing.
  - Zero changes to consumer contract; seamlessly imported into `src/App.tsx`.

- **Batch Unit Support (`batch`) for Materials & Services**:
  - Extended `Unit` type in `src/types.ts` with `'batch'` alongside `unit`, `m`, `dozen`, `100pack`, `spool`, and `service`.
  - Added optional `batchSize` field to `Material` definition to support minimum tiered volume brackets (e.g., embroidery charging Bs 60 for 1-6 logos, Bs 120 for 7-12 logos, etc.).
  - Configurable `batchSize` input field in `MaterialsView` under *Insumos* when `batch` unit is selected.

- **Dynamic Tiered Batch Proration Engine**:
  - Re-architected batch calculation to isolate tiered pricing strictly to user-selected accessories via `calculateAccessoryBatchPricing`.
  - Base garments and products preserve standard per-unit pricing without forcing batch modifications globally.
  - Added opt-in accessory selection chips and per-accessory quantity simulator in `DashboardView`.
  - Added combined order quoting (Base Garment + Selected Accessories) with breakdown of batch costs, retail pricing, and gross profit.
  - Added in-card mini batch simulator to `AccessoryCard` when `unit === 'batch'`.

### Removed
- Removed global order simulation from base product calculations and `ProfitView` so that standard products remain clean, per-unit recipes as requested.

### Fixed
- Fixed recursive circular dependency in `getMaterialCost` for manufactured accessories by using `getMaterialTrueCostPerUnit` with recursion protection instead of recursively re-evaluating product analyses.
- Resolved unit label displays across recipe ingredient selectors for batch materials.
- Implemented native Model Context Protocol (MCP) server at /mcp with 5 tools (matrix, materials, add_product, update_fabric_cost, sync_to_ventas).
- Transitioned to Full-Stack Express + Vite architecture.
- Enforced Bolivian Commercial Integer Rounding Rule (Math.round) for all retail and wholesale price calculations.
- Migrated /mcp to direct, stateless JSON-RPC 2.0 to support Gemini Spark integration.
