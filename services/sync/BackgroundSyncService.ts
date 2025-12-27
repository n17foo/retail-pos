import { getBasketService } from '../basket/basketServiceFactory';

/**
 * Background service for syncing pending orders
 * This service runs periodically to retry failed order syncs
 */
export class BackgroundSyncService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the background sync service
   * @param intervalMs How often to check for pending syncs (default: 5 minutes)
   */
  start(intervalMs: number = 300000) {
    if (this.isRunning) {
      console.log('Background sync service is already running');
      return;
    }

    console.log(`Starting background sync service with ${intervalMs}ms interval`);
    this.isRunning = true;

    // Run immediately on start
    this.performSync();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  /**
   * Stop the background sync service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Background sync service stopped');
  }

  /**
   * Perform a sync operation for all pending orders
   */
  private async performSync() {
    try {
      const basketService = await getBasketService();
      const result = await basketService.syncAllPendingOrders();

      if (result.synced > 0 || result.failed > 0) {
        console.log(`Background sync: ${result.synced} synced, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Check if the service is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();
