# Basket (Shopping Cart)

## User Story

**As a** retail cashier
**I want to** build a customer's order by adding, removing, and adjusting products in a basket
**So that** I can accurately calculate totals and proceed to checkout

## Rules

- Basket is persisted in SQLite via `BasketRepository` — survives app restarts
- Adding a duplicate product (same `productId` + `variantId`) increments quantity instead of creating a new line
- All monetary math uses `utils/money.ts` (integer-cent internally) to avoid floating-point errors
- Tax calculated automatically via `TaxProfileService` using `DEFAULT_TAX_RATE()`
- Totals recalculated on every item add/remove/quantity change
- Discount codes stored on basket but validated externally (platform or local)
- Customer info (email, name) can be attached to basket for order association
- Notes can be added for special instructions
- `BasketService` handles cart CRUD only — checkout, payment, and sync are separate services
- Basket is cleared after successful payment completion (triggered by `CheckoutService`)

---

## Flow 1: Initialize Basket

1. **App starts** → `BasketService.initialize()` called
2. **Check for active basket** → `BasketRepository.findActiveBasket()`
3. **Existing basket found** → reuse it (preserves items from previous session)
4. **No basket found** → create new empty basket with `generateUUID()` as ID
5. **Basket ready** → subtotal=0, tax=0, total=0, empty items array

## Flow 2: Add Product to Basket

1. **Cashier taps product** → `addItem({ productId, name, price, quantity, taxable })` called
2. **Duplicate check** → search existing items for matching `productId` + `variantId`
3. **Duplicate found** → increment existing item's quantity
4. **New product** → push new `BasketItem` with generated UUID
5. **Recalculate totals** → `calculateTotals()` computes subtotal, tax, total
6. **Persist** → `BasketRepository.updateBasket()` saves to SQLite
7. **Return updated basket** → UI re-renders with new item and totals

## Flow 3: Update Item Quantity

1. **Cashier adjusts quantity** → `updateItemQuantity(itemId, newQuantity)`
2. **Quantity > 0** → update the item's quantity
3. **Quantity ≤ 0** → remove the item from basket entirely
4. **Recalculate and save** → totals updated, persisted to DB

## Flow 4: Remove Item

1. **Cashier removes item** → `removeItem(itemId)`
2. **Delegates to** → `updateItemQuantity(itemId, 0)` — removes item
3. **Recalculate and save** → totals updated, persisted to DB

## Flow 5: Apply / Remove Discount

1. **Cashier enters discount code** → `applyDiscount(code)`
2. **Code stored on basket** → `discountCode` set, `discountAmount` placeholder (validated externally)
3. **Remove discount** → `removeDiscount()` clears code and amount, recalculates totals

## Flow 6: Attach Customer

1. **Cashier searches customer** → `CustomerSearchModal` opens
2. **Customer selected** → `setCustomer(email, name)` called
3. **Customer info stored** → `customerEmail` and `customerName` set on basket
4. **Persisted** → saved to SQLite for order association at checkout

## Flow 7: Add Note

1. **Cashier adds note** → `setNote("Extra napkins please")`
2. **Note stored on basket** → persisted to DB
3. **Carried to order** → note transferred to `LocalOrder` at checkout

## Flow 8: Clear Basket

1. **Payment completed** → `CheckoutService.completePayment()` calls `clearBasket()`
2. **Basket deleted** → `BasketRepository.clearBasket(basketId)` removes from DB
3. **Ready for next customer** → new basket created on next `getBasket()` call

## Questions

- How does the basket handle price changes between adding an item and checkout?
- What happens if the same product is added with different variant selections?
- How are basket items preserved across app updates?
- Should there be a maximum basket size or item quantity limit?
- How does the basket handle products that go out of stock after being added?
