import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { useSyncStore } from '../../stores/syncStore';

class QueueManager {
  private initialized = false;

  initialize() {
    if (this.initialized) return;

    // 1. Trigger when connection returns
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('Network connection restored, processing sync queue...');
        useSyncStore.getState().processQueue();
      }
    });

    // 2. Trigger on app foreground
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active, processing sync queue...');
        useSyncStore.getState().processQueue();
      }
    });

    // 3. Optional: Exponential backoff for 500 errors
    // Check queue every 30 seconds for items that are ready to retry
    setInterval(() => {
      const { queue, processQueue } = useSyncStore.getState();
      const now = new Date();

      // Check if any requests are ready to retry
      const hasReadyRequests = queue.some(request =>
        request.nextRetryAt && request.nextRetryAt <= now
      );

      if (hasReadyRequests) {
        console.log('Checking for retryable requests...');
        processQueue();
      }
    }, 30000);

    this.initialized = true;
    console.log('QueueManager initialized');
  }

  // Manual trigger for processing queue
  processQueue() {
    useSyncStore.getState().processQueue();
  }

  // Get queue status
  getQueueStatus() {
    const { queue, isProcessing } = useSyncStore.getState();
    return {
      length: queue.length,
      isProcessing,
      pendingRequests: queue.filter(r => !r.nextRetryAt || r.nextRetryAt <= new Date()).length,
      retryingRequests: queue.filter(r => r.nextRetryAt && r.nextRetryAt > new Date()).length,
    };
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
