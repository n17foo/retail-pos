# Checkout

## User Story

**As a** retail cashier
**I want to** convert a basket into a paid order with a chosen payment method
**So that** the transaction is recorded locally and queued for platform sync

## Rules

- Checkout cannot proceed with an empty basket
- `CheckoutService` depends on `BasketService` for reading/clearing the basket
- Order and order items are persisted separately in SQLite (`OrderRepository`, `OrderItemRepository`)
- Order status lifecycle: `pending` → `processing` → `paid` → `synced` (or `failed` / `cancelled`)
- Sync status lifecycle: `pending` → `synced` (or `failed`)
- Cash payments trigger `openDrawer` flag when `posConfig.drawerOpenOnCash` is enabled — UI layer opens the drawer
- Every order creation, payment, and cancellation is audit-logged via `AuditLogService`
- Basket is cleared automatically after successful payment
- Failed payments mark the order as `failed` — no basket clearing
- `CheckoutService` handles checkout + order queries; sync is handled by `OrderSyncService`

---

## Flow 1: Start Checkout

1. **Cashier taps "Checkout"** → `startCheckout(platform?, cashierId?, cashierName?)` called
2. **Validate basket** → must have at least one item, else throw error
3. **Create LocalOrder** → generate UUID, copy basket items/totals/customer/discount/note
4. **Persist order** → `OrderRepository.create()` saves order row to SQLite
5. **Persist order items** → `OrderItemRepository.createMany()` saves each line item
6. **Audit log** → `order:created` event with order ID, item count, total
7. **Return LocalOrder** → status=`pending`, syncStatus=`pending`

## Flow 2: Process Payment

1. **Payment method selected** → card, cash, Stripe NFC, etc.
2. **Mark processing** → `markPaymentProcessing(orderId)` sets status to `processing`
3. **Payment provider processes** → external payment service handles transaction
4. **Payment succeeds** → `completePayment(orderId, paymentMethod, transactionId?)` called
5. **Update order** → `OrderRepository.updatePayment()` records method + transaction ID, sets status to `paid`
6. **Clear basket** → `BasketService.clearBasket()` removes current basket
7. **Check cash drawer** → if `paymentMethod === 'cash'` and `posConfig.drawerOpenOnCash` → set `openDrawer: true`
8. **Audit log** → `order:paid` event with order ID, payment method, transaction ID
9. **Return CheckoutResult** → `{ success: true, orderId, openDrawer }`

## Flow 3: Payment Failure

1. **Payment provider errors** → exception thrown during `completePayment`
2. **Mark failed** → `OrderRepository.updateStatus(orderId, 'failed')`
3. **Basket preserved** → `clearBasket()` NOT called — cashier can retry
4. **Return CheckoutResult** → `{ success: false, orderId, error: "..." }`

## Flow 4: Cancel Order

1. **Cashier cancels** → `cancelOrder(orderId)` called
2. **Update status** → `OrderRepository.updateStatus(orderId, 'cancelled')`
3. **Audit log** → `order:cancelled` event with order ID

## Flow 5: Query Orders

1. **View daily orders** → `getLocalOrders(status?)` returns all or filtered by status
2. **View unsynced** → `getUnsyncedOrders()` returns orders with `syncStatus !== 'synced'`
3. **View single order** → `getLocalOrder(orderId)` returns full order with items
4. **Order mapping** → `OrderRow` + `OrderItemRow` mapped to `LocalOrder` with typed `BasketItem[]`

## Flow 6: Post-Checkout Sync

1. **Order paid** → `syncStatus` is `pending`
2. **BackgroundSyncService picks up** → finds unsynced orders via `getUnsyncedOrders()`
3. **Sync to platform** → `OrderSyncService` sends order to e-commerce platform API
4. **Success** → status updated to `synced`, `syncedAt` timestamp set
5. **Failure** → retry with exponential backoff, up to `MAX_SYNC_RETRIES()`
6. **Exhausted retries** → `syncStatus` set to `failed`, appears in Sync Queue screen

## Questions

- What happens if the app crashes between `startCheckout` and `completePayment`?
- How are split payments (part cash, part card) handled?
- Can a cancelled order be re-opened?
- How does checkout handle concurrent access from multiple registers?
- What is the maximum order size before performance degrades?
