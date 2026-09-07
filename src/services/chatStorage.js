import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@studymaze_tutor_';
const INDEX_KEY = '@studymaze_tutor_index';

function id() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function readIndex() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const chatStorage = {
  createId: id,

  async getMessages(conversationId) {
    if (!conversationId) return [];
    try {
      const raw = await AsyncStorage.getItem(PREFIX + conversationId);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveMessages(conversationId, messages) {
    if (!conversationId) return;
    await AsyncStorage.setItem(PREFIX + conversationId, JSON.stringify(messages));
  },

  async addMessage(conversationId, message) {
    const messages = await this.getMessages(conversationId);
    const next = {
      id: message.id || id(),
      timestamp: message.timestamp || new Date().toISOString(),
      ...message,
    };
    messages.push(next);
    await this.saveMessages(conversationId, messages);
    return next;
  },

  async listConversations() {
    return readIndex();
  },

  async upsertConversation(meta) {
    if (!meta?.id) return;
    const list = await readIndex();
    const next = {
      id: meta.id,
      title: meta.title || 'Open session',
      preview: meta.preview || '',
      mode: meta.mode || 'general',
      updatedAt: meta.updatedAt || Date.now(),
    };
    await AsyncStorage.setItem(
      INDEX_KEY,
      JSON.stringify([next, ...list.filter((item) => item.id !== next.id)].slice(0, 50))
    );
    return next;
  },

  async deleteConversation(conversationId) {
    if (!conversationId) return;
    await AsyncStorage.removeItem(PREFIX + conversationId);
    const list = await readIndex();
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list.filter((item) => item.id !== conversationId)));
  },
};
