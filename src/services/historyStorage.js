import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  solver: '@studymaze_history_solver',
};

async function read(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function write(key, items) {
  await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
}

export const historyStorage = {
  async list(kind) {
    return read(KEYS[kind]);
  },

  async add(kind, entry) {
    const items = await read(KEYS[kind]);
    const next = {
      id: entry.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: entry.timestamp || Date.now(),
      ...entry,
    };
    await write(KEYS[kind], [next, ...items.filter((item) => item.id !== next.id)]);
    return next;
  },

  async remove(kind, id) {
    const items = await read(KEYS[kind]);
    await write(KEYS[kind], items.filter((item) => item.id !== id));
  },

  async clear(kind) {
    await AsyncStorage.removeItem(KEYS[kind]);
  },
};
