import { db } from '../utils/db';
import { generateUUID } from '../utils/uuid';

/** DB row shape for baskets table */
export interface BasketRow {
  id: string;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  discount_amount: number | null;
  discount_code: string | null;
  customer_email: string | null;
  customer_name: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

/** DB row shape for local_orders table */
export interface LocalOrderRow {
  id: string;
  platform_order_id: string | null;
  platform: string | null;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  discount_amount: number | null;
  discount_code: string | null;
  customer_email: string | null;
  customer_name: string | null;
  note: string | null;
  payment_method: string | null;
  payment_transaction_id: string | null;
  cashier_id: string | null;
  cashier_name: string | null;
  status: string;
  sync_status: string;
  sync_error: string | null;
  created_at: number;
  updated_at: number;
  paid_at: number | null;
  synced_at: number | null;
}

export interface CreateBasketInput {
  id: string;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface UpdateBasketInput {
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  discountAmount: number | null;
  discountCode: string | null;
  customerEmail: string | null;
  customerName: string | null;
  note: string | null;
}

export interface CreateLocalOrderInput {
  id: string;
  platform: string | null;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  discountAmount: number | null;
  discountCode: string | null;
  customerEmail: string | null;
  customerName: string | null;
  note: string | null;
  cashierId: string | null;
  cashierName: string | null;
}

export class BasketRepository {
  // ============ Basket Operations ============

  async findActiveBasket(): Promise<BasketRow | null> {
    return db.getFirstAsync<BasketRow>('SELECT * FROM baskets WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']);
  }

  async createBasket(input: CreateBasketInput): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO baskets (id, items, subtotal, tax, total, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.items, input.subtotal, input.tax, input.total, 'active', now, now]
    );
  }

  async updateBasket(basketId: string, input: UpdateBasketInput): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `UPDATE baskets SET 
        items = ?, subtotal = ?, tax = ?, total = ?, 
        discount_amount = ?, discount_code = ?,
        customer_email = ?, customer_name = ?, note = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        input.items,
        input.subtotal,
        input.tax,
        input.total,
        input.discountAmount,
        input.discountCode,
        input.customerEmail,
        input.customerName,
        input.note,
        now,
        basketId,
      ]
    );
  }

  async clearBasket(basketId: string): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `UPDATE baskets SET items = ?, subtotal = ?, tax = ?, total = ?, 
       discount_amount = NULL, discount_code = NULL, updated_at = ?
       WHERE id = ?`,
      ['[]', 0, 0, 0, now, basketId]
    );
  }

  // ============ Local Order Operations ============

  async createLocalOrder(input: CreateLocalOrderInput): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO local_orders (
        id, platform, items, subtotal, tax, total,
        discount_amount, discount_code, customer_email, customer_name, note,
        cashier_id, cashier_name,
        status, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.platform,
        input.items,
        input.subtotal,
        input.tax,
        input.total,
        input.discountAmount,
        input.discountCode,
        input.customerEmail,
        input.customerName,
        input.note,
        input.cashierId,
        input.cashierName,
        'pending',
        'pending',
        now,
        now,
      ]
    );
  }

  async findLocalOrderById(orderId: string): Promise<LocalOrderRow | null> {
    return db.getFirstAsync<LocalOrderRow>('SELECT * FROM local_orders WHERE id = ?', [orderId]);
  }

  async findLocalOrders(status?: string): Promise<LocalOrderRow[]> {
    let query = 'SELECT * FROM local_orders';
    const params: (string | null)[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    return db.getAllAsync<LocalOrderRow>(query, params);
  }

  async findUnsyncedOrders(): Promise<LocalOrderRow[]> {
    return db.getAllAsync<LocalOrderRow>(
      `SELECT * FROM local_orders 
       WHERE status = ? AND sync_status != ? 
       ORDER BY created_at ASC`,
      ['paid', 'synced']
    );
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const now = Date.now();
    await db.runAsync('UPDATE local_orders SET status = ?, updated_at = ? WHERE id = ?', [status, now, orderId]);
  }

  async updateOrderPayment(orderId: string, paymentMethod: string, transactionId: string | null): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `UPDATE local_orders SET 
        status = ?, payment_method = ?, payment_transaction_id = ?,
        paid_at = ?, updated_at = ?
       WHERE id = ?`,
      ['paid', paymentMethod, transactionId, now, now, orderId]
    );
  }

  async updateOrderSyncSuccess(orderId: string, platformOrderId: string): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `UPDATE local_orders SET 
        platform_order_id = ?, sync_status = ?, synced_at = ?, updated_at = ?
       WHERE id = ?`,
      [platformOrderId, 'synced', now, now, orderId]
    );
  }

  async updateOrderSyncError(orderId: string, syncStatus: string, errorMessage: string): Promise<void> {
    const now = Date.now();
    await db.runAsync('UPDATE local_orders SET sync_status = ?, sync_error = ?, updated_at = ? WHERE id = ?', [
      syncStatus,
      errorMessage,
      now,
      orderId,
    ]);
  }
}

export const basketRepository = new BasketRepository();
