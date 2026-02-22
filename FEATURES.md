# RetailPOS — Feature Roadmap

All planned features are complete. This document describes every feature area, what was built, and the implementation details behind each.

**Status**: 🟢 All phases complete — 198/198 tests passing, clean TypeScript compile.

---

## Table of Contents

- [Phase 1 — Core POS](#phase-1--core-pos)
- [Phase 2 — E-commerce Platform Integration](#phase-2--e-commerce-platform-integration)
- [Phase 3 — Hardware & Payments](#phase-3--hardware--payments)
- [Phase 4 — Operations & Management](#phase-4--operations--management)
- [Phase 5 — System Quality](#phase-5--system-quality)

---

## Phase 1 — Core POS

🟢 **Complete**

The foundational POS loop: browse products, build a basket, check out, and sync the order.

### 1.1 Product Catalog 🟢

- Unified product interface normalises data from all 8 e-commerce platforms
- Products have variants (size, colour, etc.) with per-variant pricing, SKU, barcode, and inventory
- Platform-specific mappers convert API responses to `UnifiedProduct`
- Pagination: page-based (most platforms) or cursor-based (Shopify)
- Full-text search with debounced input; category filtering via sidebar
- Barcode scan → instant product lookup and basket add
- Product grid with name, price, image, stock, and platform badge

**Key files**: `services/product/`, `services/search/`, `hooks/useProducts.ts`, `hooks/useProductsForDisplay.ts`

---

### 1.2 Shopping Basket 🟢

- Basket persisted in SQLite via `BasketRepository` — survives app restarts and crashes
- Adding a duplicate product (same `productId` + `variantId`) increments quantity instead of creating a new line
- All monetary math uses `utils/money.ts` (integer-cent internally) — no floating-point errors
- Tax calculated automatically via `TaxProfileService` using the configured tax rate
- Totals (subtotal, tax, grand total) recalculated on every change
- Discount codes stored on basket; validated against platform API
- Customer info (email, name) attachable to basket for order association
- Notes field for special instructions
- Basket cleared automatically after successful payment

**Key files**: `services/basket/BasketService.ts`, `repositories/BasketRepository.ts`, `contexts/BasketProvider.tsx`

---

### 1.3 Checkout & Order Creation 🟢

- `CheckoutService` converts a basket into a `LocalOrder` stored in SQLite
- Order status lifecycle: `pending` → `processing` → `paid` → `synced` (or `failed` / `cancelled`)
- Every order creation, payment, and cancellation is audit-logged via `AuditLogService`
- Cash payments set `openDrawer: true` on `CheckoutResult` when `posConfig.drawerOpenOnCash` is enabled — UI layer opens the drawer
- Failed payments preserve the basket so the cashier can retry
- `CheckoutService` handles checkout and order queries; sync is a separate concern

**Key files**: `services/checkout/CheckoutService.ts`, `repositories/OrderRepository.ts`, `repositories/OrderItemRepository.ts`

---

### 1.4 Order Sync to Platform 🟢

- `OrderSyncService` maps local orders to platform-specific format and calls the platform API
- `BackgroundSyncService` runs continuously, picks up unsynced orders, applies exponential backoff (base × 2^failures, capped at 15 min)
- Sync pauses when the app is backgrounded; resumes on foreground
- On success: `syncStatus` → `synced`, `platformOrderId` stored
- On failure: `syncStatus` → `failed`, error stored, notification pushed
- Max retries enforced via `posConfig.maxSyncRetries`

**Key files**: `services/sync/OrderSyncService.ts`, `services/sync/BackgroundSyncService.ts`, `services/sync/BaseSyncService.ts`

---

### 1.5 Product Variants 🟢

- `VariantPicker` modal opens when a product has multiple variants
- Option chips filter the variant list (e.g. Size: S/M/L, Colour: Red/Blue)
- Each variant has its own price, SKU, barcode, and inventory quantity
- Selected variant added to basket with variant-specific data

**Key files**: `components/VariantPicker.tsx`, `services/product/ProductServiceInterface.ts`

---

### 1.6 Tax Profiles 🟢

- `TaxProfileService` — CRUD for named tax profiles with rates and rules
- Default rate seeded on first run; configurable per store
- Tax calculated on every basket change; displayed as a separate line in totals
- `DEFAULT_TAX_RATE()` is a function (not a constant) — reads from `posConfig`

**Key files**: `services/tax/TaxProfileService.ts`

---

## Phase 2 — E-commerce Platform Integration

🟢 **Complete**

Eight platforms, each with a full service implementation behind a common interface.

### 2.1 Supported Platforms 🟢

| Platform    | Products | Orders | Customers | Discounts | Gift Cards | Refunds |
| ----------- | -------- | ------ | --------- | --------- | ---------- | ------- |
| Shopify     | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| WooCommerce | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| BigCommerce | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| Magento     | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| Sylius      | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| Wix         | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| PrestaShop  | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| Squarespace | ✅       | ✅     | ✅        | ✅        | ✅         | ✅      |
| Offline     | ✅       | ✅     | —         | —         | —          | ✅      |

---

### 2.2 Token Management & Auto-Refresh 🟢

- `TokenService` stores platform tokens (ACCESS, REFRESH, ID, API_KEY, SESSION) with expiration
- `withTokenRefresh` wrapper automatically refreshes expired tokens before any API call
- Registered refresh functions called when token expires; new token stored
- On refresh failure: error propagated, user prompted to re-authenticate

**Key files**: `services/token/TokenService.ts`

---

### 2.3 Platform Service Registry 🟢

- `PlatformServiceRegistry` provides unified access to product, order, customer, discount, and gift card services per platform
- Services cached per platform instance — no redundant initialisation
- `ServiceConfigBridge` wires platform credentials into all services on startup

**Key files**: `services/platform/PlatformServiceRegistry.ts`, `services/config/ServiceConfigBridge.ts`

---

### 2.4 Customer Search & Attachment 🟢

- Search platform customer database by name or email at checkout
- Debounced (300ms) with stale-response cancellation
- Results show: name, email, phone, order count, total spent
- Cursor-based pagination for large customer lists
- Customer attached to basket → included in `LocalOrder` → synced to platform
- Offline mode: customer search disabled, orders created without customer

**Key files**: `services/customer/`, `hooks/useCustomerSearch.ts`, `components/CustomerSearchModal.tsx`

---

### 2.5 Discounts & Coupons 🟢

- Cashier enters coupon code → validated against platform API in real time
- Supports percentage and fixed-amount discount types
- Applied to basket total; removed cleanly with `removeDiscount()`
- Each platform has its own discount service implementation (cart rules, discount codes, etc.)

**Key files**: `services/discount/`

---

### 2.6 Gift Cards 🟢

- `checkBalance(code)` → returns current balance from platform API
- `redeemGiftCard(code, amount)` → deducts amount against order
- Platform-specific implementations for all 8 platforms
- Balance shown to cashier before redemption

**Key files**: `services/giftcard/`

---

### 2.7 Category Management 🟢

- Categories fetched from platform and displayed in the sidebar filter
- `BaseCategoryService` base class with `protected logger` — all platform subclasses inherit
- `CompositeCategoryService` aggregates across multiple platform services
- `CategoryServiceFactory` singleton manages platform service instances

**Key files**: `services/category/`

---

### 2.8 Offline Mode 🟢

- Full POS functionality with no internet connection
- All data (products, orders, users) stored locally in SQLite
- Orders queued for sync; background sync catches up when internet returns
- `ECommercePlatform.OFFLINE` — no platform API calls, no customer/discount/gift card services

---

## Phase 3 — Hardware & Payments

🟢 **Complete**

### 3.1 Barcode & QR Scanning 🟢

Four scanner types, each implementing `ScannerServiceInterface`:

| Type        | Enum                      | Use case                    |
| ----------- | ------------------------- | --------------------------- |
| Camera      | `ScannerType.CAMERA`      | Mobile/tablet — Expo Camera |
| Bluetooth   | `ScannerType.BLUETOOTH`   | BLE barcode scanners        |
| USB         | `ScannerType.USB`         | USB HID barcode scanners    |
| QR Hardware | `ScannerType.QR_HARDWARE` | Desktop QR readers (USB/BT) |

- `startScanListener(callback)` → returns `subscriptionId`; multiple listeners supported
- `stopScanListener(subscriptionId)` → removes specific listener on unmount
- Mock implementations for all types (`USE_MOCK_SCANNER=true`)
- QR hardware scanner: data terminated by Enter key (standard HID keyboard input)

**Key files**: `services/scanner/`, `hooks/useBarcodeScanner.ts`, `hooks/useScanner.ts`

---

### 3.2 Receipt Printer 🟢

- Thermal printer support via ESC/POS (USB, Bluetooth, network)
- `ReceiptConfigService` — configurable logo, header, footer, paper size, fonts
- `printReceipt(orderData)` — itemised receipt with totals, tax, payment method, store branding
- Optional QR code on receipt containing transaction details
- `printDailyReport(dateRange)` — formatted daily report for store records
- Printer discovery and connection management

**Key files**: `services/printer/`, `hooks/usePrinter.ts`

---

### 3.3 Cash Drawer 🟢

- Decoupled from printer — `CashDrawerServiceInterface` is a standalone peripheral
- `PrinterDrawerDriver` (ESC/POS via printer port) and `NoOpDrawerDriver` (no hardware)
- `CheckoutResult.openDrawer?: boolean` — service decides _if_, UI _does_ the opening
- Auto-opens on cash payment when `posConfig.drawerOpenOnCash` is enabled
- Every open (automatic or manual) is audit-logged with `userId`, `registerId`, `timestamp`
- Manual open available from Settings for managers

**Key files**: `services/drawer/CashDrawerService.ts`

---

### 3.4 Payment Terminals 🟢

Four payment providers:

| Provider   | Type          | Platform           |
| ---------- | ------------- | ------------------ |
| Stripe     | Card terminal | All                |
| Stripe NFC | Tap-to-pay    | Mobile/tablet only |
| Square     | Card terminal | All                |
| Worldpay   | Card terminal | All                |

- Terminal discovery, connection, and auto-disconnect on screen unmount
- `processPayment({ amount, reference, currency, items })` → `PaymentResponse`
- Response includes: `transactionId`, `receiptNumber`, `cardBrand`, `last4`, `paymentMethod`
- Full and partial refunds via `refundTransaction(transactionId, amount)`
- Transaction void via `voidTransaction(transactionId)` — before settlement
- Demo mode when no route params provided (safe for training)
- Every payment, void, and refund is audit-logged

**Key files**: `services/payment/`, `screens/PaymentTerminalScreen.tsx`, `components/StripeNfcPaymentTerminal.tsx`

---

## Phase 4 — Operations & Management

🟢 **Complete**

### 4.1 Returns & Refunds 🟢

- `ReturnService` — unified service handling both stock returns and monetary refunds
- Two refund types: **payment refund** (card `transactionId`) and **e-commerce refund** (platform `orderId`)
- `processReturn(input)` — creates return record, adjusts inventory, optionally triggers refund
- `processRefund(orderId, refundData, platform?)` — direct platform API refund
- `processPaymentRefund(transactionId, amount, reason?)` — payment terminal refund
- Refund history auto-loads when an ID is entered
- Every refund audit-logged with `userId`, `amount`, `reason`
- 10 platform implementations: Shopify, WooCommerce, BigCommerce, Magento, Sylius, Wix, PrestaShop, Squarespace, Offline + interface

**Key files**: `services/returns/ReturnService.ts`, `services/returns/platforms/`, `screens/ReturnsScreen.tsx`

---

### 4.2 Inventory Management 🟢

- Real-time inventory tracking synced with e-commerce platform
- `BaseInventoryService` base class with `protected logger` — all platform subclasses inherit
- `CompositeInventoryService` aggregates across multiple platform services
- Low-stock alerts via `NotificationService`
- Manual stock adjustments with audit trail
- `InventoryScreen` — filterable list with inline quantity editing

**Key files**: `services/inventory/`, `screens/InventoryScreen.tsx`, `hooks/useInventory.ts`

---

### 4.3 Reporting & Analytics 🟢

- Date ranges: today, yesterday, week, month
- Summary metrics: total sales, order count, average order value, tax collected
- Charts: hourly breakdown (today/yesterday) or daily breakdown (week/month)
- Payment method breakdown with percentages
- Cashier performance ranked by total sales volume
- CSV export → native share sheet (email, files, etc.)
- Currency formatting from store settings

**Key files**: `services/reporting/`, `screens/ReportingScreen.tsx`, `hooks/useReporting.ts`

---

### 4.4 Sync Queue Management 🟢

- `SyncQueueScreen` — monitor all pending, syncing, synced, and failed orders
- Summary bar: total, pending, failed counts
- Order cards: colour-coded status badge, amount, cashier, timestamps, error details
- Individual retry and discard per order; bulk "Retry All"
- Discard is destructive — confirmation required, audit-logged
- Pull-to-refresh; empty state: "All synced!" with checkmark

**Key files**: `screens/SyncQueueScreen.tsx`, `hooks/useSyncQueue.ts`

---

### 4.5 Multi-Register Offline Sync 🟢

Three operating modes:

| Mode           | Description                                            |
| -------------- | ------------------------------------------------------ |
| **Standalone** | Single register, no networking, fully offline          |
| **Server**     | Runs HTTP server on LAN; other registers connect to it |
| **Client**     | Connects to a server register over LAN                 |

- Server discovery via subnet scanning (`LocalApiDiscovery`)
- Shared secret authenticates inter-register communication
- `SyncEventBus` — pub/sub with recent event buffer for real-time sync
- `SyncPoller` — client-side polling with exponential backoff (fast when active, slow when idle)
- Event types: order created, inventory updated, user changed, settings changed
- Last-write-wins conflict resolution

**Key files**: `services/localapi/`

---

### 4.6 Authentication 🟢

Six authentication methods with platform-aware mode filtering:

| Method                | Type            | Mode    | Hardware           |
| --------------------- | --------------- | ------- | ------------------ |
| 6-digit PIN           | `pin`           | offline | None — always on   |
| Fingerprint / Face ID | `biometric`     | offline | Device biometric   |
| Password              | `password`      | offline | None               |
| Magnetic card swipe   | `magstripe`     | offline | USB/BT card reader |
| RFID / NFC badge      | `rfid_nfc`      | offline | USB/BT NFC reader  |
| Platform login        | `platform_auth` | online  | None — always on   |

- `AuthMode` (`'online'` / `'offline'`) determined by selected e-commerce platform
- PIN always enabled in offline mode; `platform_auth` always enabled in online mode
- Hardware methods only appear when hardware is detected
- Every login attempt (success and failure) is audit-logged
- Biometric uses dynamic `require('expo-local-authentication')` — safe if package absent

**Key files**: `services/auth/`, `screens/LoginScreen.tsx`

---

### 4.7 Role-Based Access Control 🟢

Three roles with filtered menu access:

| Screen            | Cashier | Manager | Admin |
| ----------------- | ------- | ------- | ----- |
| Daily Orders      | ✅      | ✅      | ✅    |
| Settings          | ✅      | ✅      | ✅    |
| Returns & Refunds | ✅      | ✅      | ✅    |
| Printer           | ✅      | ✅      | ✅    |
| Payment Terminal  | ✅      | ✅      | ✅    |
| Reports           | —       | ✅      | ✅    |
| Sync Queue        | —       | ✅      | ✅    |
| Users             | —       | —       | ✅    |

- Unknown or undefined role defaults to `'cashier'` (least privilege)
- `canAccessTab()` and `canAccessMoreMenuItem()` enforce access at render time

**Key files**: `utils/roleAccess.ts`

---

### 4.8 Settings (10-Tab Configuration Screen) 🟢

| Tab            | What it configures                                            |
| -------------- | ------------------------------------------------------------- |
| General        | Store name, address, phone, currency                          |
| POS Config     | Tax rate, max sync retries, drawer-on-cash                    |
| Authentication | Auth methods, mode (online/offline)                           |
| Payment        | Provider (Stripe/Square/Worldpay), API keys, terminal         |
| Printer        | Device discovery, receipt layout, paper size                  |
| Scanner        | Scanner type, device selection, sensitivity                   |
| E-Commerce     | Platform selection, API credentials, connection test          |
| Offline        | Multi-register mode (standalone/server/client), shared secret |
| Sync Queue     | Monitor and manage failed order syncs                         |
| Receipt        | Logo, header, footer, QR code, font settings                  |

- Responsive layout: side nav (desktop), scrollable tabs (tablet), dropdown (mobile)
- Floating save bar on unsaved changes
- Settings changes audit-logged

**Key files**: `screens/SettingsScreen.tsx`, `screens/settings/`

---

### 4.9 Onboarding Wizard 🟢

Two paths depending on platform selection:

**Online path (10 steps)**: Welcome → Platform Selection → Platform Config → Payment Provider → Printer Setup → Scanner Setup → POS Config → Auth Method Setup → Admin User → Summary

**Offline path (11 steps)**: Welcome → Platform Selection (Offline) → Offline Store Setup → Admin User → Staff Setup → Payment Provider → Printer Setup → Scanner Setup → POS Config → Auth Method Setup → Summary

- Progress indicator shows current step and total
- Back navigation preserves all entered data
- Hardware steps (printer, scanner) can be skipped
- `setIsOnboarded(true)` on completion — wizard never shown again

**Key files**: `screens/onboarding/`, `contexts/OnboardingProvider.tsx`

---

## Phase 5 — System Quality

🟢 **Complete**

### 5.1 Audit Logging 🟢

- `AuditLogService` — KV-backed, rolling 2000-entry history
- Every business event logged: `order:created`, `order:paid`, `order:synced`, `order:cancelled`, `refund:processed`, `return:created`, `auth:login`, `auth:failed`, `settings:changed`, `drawer:opened`, `sync:started`, `sync:completed`, `sync:failed`
- Filter by action, user, or date range
- CSV export via native share sheet
- Wired into `CheckoutService`, `ReturnService`, `AuthService`, `CashDrawerService`

**Key files**: `services/audit/AuditLogService.ts`

---

### 5.2 Notifications System 🟢

- `NotificationService` — in-memory singleton, listener pattern
- Severity levels: `info`, `warning`, `error`, `success`
- Optional action button on notifications (e.g. "View Sync Queue")
- `NotificationProvider` — React context, subscribes via `addListener()`
- Auto-dismiss toast at top of screen for new notifications
- `NotificationBell` — unread count badge, accessible label
- `NotificationDrawer` — full list, mark read, mark all read, clear all
- Max 100 notifications; oldest dropped when exceeded
- Wired into `BackgroundSyncService` (sync events) and `ReturnService` (return/refund events)

**Key files**: `services/notifications/NotificationService.ts`, `contexts/NotificationProvider.tsx`, `components/NotificationBell.tsx`, `components/NotificationDrawer.tsx`

---

### 5.3 Accessibility 🟢

Full screen reader support across all interactive components:

- `accessibilityLabel` — descriptive labels on all buttons and inputs
- `accessibilityRole` — correct semantic roles (`button`, `radio`, `text`, etc.)
- `accessibilityHint` — action descriptions for non-obvious controls
- `accessibilityState` — `checked`, `disabled`, `selected` states

Components covered: `CheckoutModal`, `Basket`, `BasketContent`, `VariantPicker`, `CustomerSearchModal`, `ErrorBoundary`, `NotificationBell`, `NotificationDrawer`

---

### 5.4 Error Boundary & Crash Recovery 🟢

- `ErrorBoundary` wraps the entire app
- On crash: displays error message with "Try Again" retry button
- Basket state preserved across crash recovery (SQLite-backed)
- Retry button has `accessibilityLabel` and `accessibilityRole`

**Key files**: `components/ErrorBoundary.tsx`

---

### 5.5 Structured Logging 🟢

- `LoggerFactory` — singleton with pluggable `LogTransport` providers
- Every service uses `LoggerFactory.getInstance().createLogger(name)` — no `console.log` anywhere in the codebase
- Base classes (`BaseSyncService`, `BaseSearchService`, `BaseCategoryService`, `BaseOrderService`, `BaseProductService`, `BaseInventoryService`) expose `protected logger` for subclass inheritance
- Composite services and factories each have their own `private logger`
- Transport interface: `{ name, minLevel?, log(entry) }` — add Sentry, Datadog, or NewRelic via `addTransport()`

**Key files**: `services/logger/LoggerFactory.ts`

---

### 5.6 Internationalisation 🟢

- `react-i18next` with `expo-localization` for device locale detection
- Four languages: English (`en`), Spanish (`es`), French (`fr`), German (`de`)
- Missing translation keys logged via structured logger (not `console.warn`)
- Language switchable at runtime

**Key files**: `locales/i18n.ts`, `locales/`

---

### 5.7 Cross-Platform Builds 🟢

| Platform                      | How                                                        |
| ----------------------------- | ---------------------------------------------------------- |
| iOS                           | Expo managed workflow, `expo build`                        |
| Android                       | Expo managed workflow, `expo build`                        |
| Web                           | Metro bundler, `expo export`                               |
| Desktop (Windows/macOS/Linux) | Electron, built on every push to `main` via GitHub Actions |

- Desktop installers available from GitHub Actions artifacts
- `NSFaceIDUsageDescription` included in `app.json` for iOS Face ID
- `NSCameraUsageDescription`, `NSBluetoothAlwaysUsageDescription` included

---

## Known Pre-Production Gaps

These are documented limitations to address before a production deployment:

| Gap                         | Detail                                                      | Fix                                                                                 |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **PIN plaintext storage**   | User PINs stored as plaintext strings in SQLite `users.pin` | Hash with bcrypt or Argon2 in `UserRepository`; compare hashes in `PinAuthProvider` |
| **API credential storage**  | Platform API keys stored in SQLite `KeyValueRepository`     | Move to OS secure enclave / encrypted storage                                       |
| **Audit log retention**     | Rolling 2000-entry in-app log only                          | Export to external log store for compliance                                         |
| **Multi-register security** | Shared secret transmitted over LAN                          | Use TLS for inter-register communication                                            |
| **PCI compliance**          | Card data handled by terminal SDK                           | Verify PCI DSS requirements for your region and deployment                          |

---

_Last updated: February 22, 2026_
