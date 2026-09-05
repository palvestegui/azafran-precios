# Changelog

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
