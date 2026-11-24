import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryFallback = new Map<string, string>();

/**
 * Safe multi-platform persistent secure storage wrapper.
 * Uses expo-secure-store on native devices, and in-memory fallback on web/unsupported environments.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return memoryFallback.get(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        memoryFallback.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        memoryFallback.delete(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};
