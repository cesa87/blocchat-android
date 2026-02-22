import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Storage} from '@reown/appkit-react-native';

function safeJsonParse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

function safeJsonStringify<T>(value: T): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export const storage: Storage = {
  async getKeys(): Promise<string[]> {
    return await AsyncStorage.getAllKeys() as string[];
  },

  async getEntries<T = any>(): Promise<[string, T][]> {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys as string[]);
    return pairs
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, safeJsonParse<T>(v!)]);
  },

  async getItem<T = any>(key: string): Promise<T | undefined> {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return undefined;
    return safeJsonParse<T>(raw);
  },

  async setItem<T = any>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, safeJsonStringify(value));
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
