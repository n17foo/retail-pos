/**
 * Interfaces for the persistent request queue system
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  attempts: number;
  maxAttempts?: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  requestId?: string; // For idempotency
}

export interface SyncStoreState {
  queue: QueuedRequest[];
  isProcessing: boolean;
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'attempts' | 'createdAt'>) => void;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => void;
  updateRequest: (id: string, updates: Partial<QueuedRequest>) => void;
  clearQueue: () => void;
  getQueueLength: () => number;
}
