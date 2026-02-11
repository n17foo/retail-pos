import { sqliteStorage, SQLiteStorageService } from './SQLiteStorageService';

/**
 * Storage - A centralized storage service using SQLite for persistent key-value storage
 * This provides a consistent interface for all storage operations backed by SQLite
 */
export class Storage {
  private static instance: Storage;
  private sqliteService: SQLiteStorageService;

  private constructor() {
    this.sqliteService = sqliteStorage;
  }

  /**
   * Get the singleton instance of the StorageService
   */
  public static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  /**
   * Set a value in storage
   * @param key The key to store the value under
   * @param value The value to store (will be JSON stringified if not a string)
   */
  async setItem(key: string, value: string | object | number | boolean): Promise<void> {
    return this.sqliteService.setItem(key, value);
  }

  /**
   * Get a value from storage
   * @param key The key to retrieve the value for
   * @returns The value as a string, or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    return this.sqliteService.getItem(key);
  }

  /**
   * Remove an item from storage
   * @param key The key to remove
   */
  async removeItem(key: string): Promise<void> {
    return this.sqliteService.removeItem(key);
  }

  /**
   * Get a parsed JSON value from storage
   * @param key The key to retrieve the value for
   * @returns The parsed object, or null if not found or invalid JSON
   */
  async getObject<T>(key: string): Promise<T | null> {
    return this.sqliteService.getObject<T>(key);
  }

  /**
   * Store an object in storage after JSON stringifying it
   * @param key The key to store the object under
   * @param value The object to store
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    return this.sqliteService.setObject<T>(key, value);
  }

  /**
   * Check if a key exists in storage
   * @param key The key to check
   * @returns True if the key exists
   */
  async containsKey(key: string): Promise<boolean> {
    return this.sqliteService.containsKey(key);
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    return this.sqliteService.clearKeyValueStore();
  }

  /**
   * Get all keys in storage
   * @returns Array of keys
   */
  async getAllKeys(): Promise<string[]> {
    return this.sqliteService.getAllKeys();
  }

  /**
   * Set multiple items at once
   * @param items Array of [key, value] pairs
   */
  async multiSet(items: [string, string][]): Promise<void> {
    return this.sqliteService.multiSet(items);
  }

  /**
   * Get multiple items at once
   * @param keys Array of keys to retrieve
   * @returns Array of [key, value] pairs
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return this.sqliteService.multiGet(keys);
  }
}

// Export a singleton instance for easy import
export const storage = Storage.getInstance();
