import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedRequest, SyncStoreState } from '../types/syncQueue';

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,

      // Add a request to the outbox
      addToQueue: (request) => {
        const newRequest: QueuedRequest = {
          ...request,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          attempts: 0,
          createdAt: new Date(),
          requestId: request.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          queue: [...state.queue, newRequest]
        }));

        // Start processing if not already processing
        if (!get().isProcessing) {
          get().processQueue();
        }
      },

      // Process the queue
      processQueue: async () => {
        const { queue } = get();

        if (queue.length === 0) {
          set({ isProcessing: false });
          return;
        }

        set({ isProcessing: true });

        for (let i = 0; i < queue.length; i++) {
          const action = queue[i];

          try {
            const response = await fetch(action.url, {
              method: action.method,
              body: action.body ? JSON.stringify(action.body) : undefined,
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': action.requestId,
                ...action.headers,
              },
            });

            if (response.ok) {
              // SUCCESS: Remove from queue
              set((state) => ({
                queue: state.queue.filter((item) => item.id !== action.id)
              }));
            } else if (response.status >= 500) {
              // SERVER ERROR: Stop processing, wait for next scheduled attempt
              console.warn(`Server error ${response.status} for request ${action.id}. Retrying later...`);

              // Update attempt count and next retry time (exponential backoff)
              const attempts = action.attempts + 1;
              const backoffMs = Math.min(30000 * Math.pow(2, attempts - 1), 300000); // Max 5 minutes
              const nextRetryAt = new Date(Date.now() + backoffMs);

              get().updateRequest(action.id, {
                attempts,
                lastAttemptAt: new Date(),
                nextRetryAt,
              });

              break; // Stop processing queue
            } else if (response.status >= 400) {
              // CLIENT ERROR: Remove from queue (don't retry)
              console.warn(`Client error ${response.status} for request ${action.id}. Removing from queue.`);
              set((state) => ({
                queue: state.queue.filter((item) => item.id !== action.id)
              }));
            }
          } catch (error) {
            // NETWORK ERROR: Stop processing, wait for NetInfo trigger
            console.warn(`Network error for request ${action.id}:`, error);
            break;
          }
        }

        set({ isProcessing: false });
      },

      // Remove a request from the queue
      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id)
        }));
      },

      // Update a request in the queue
      updateRequest: (id, updates) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        }));
      },

      // Clear the entire queue
      clearQueue: () => {
        set({ queue: [] });
      },

      // Get queue length
      getQueueLength: () => {
        return get().queue.length;
      },
    }),
    {
      name: 'sync-queue-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        // Don't persist isProcessing state
      }),
    }
  )
);

// Helper function to add requests to queue
export const addRequestToQueue = (
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: any,
  headers?: Record<string, string>,
  requestId?: string
) => {
  useSyncStore.getState().addToQueue({
    url,
    method,
    body,
    headers,
    requestId,
  });
};
