import { File } from 'expo-file-system';
import { mimeFromFileName } from '../constants/studyFiles';

const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_FLASK_API_URL || inferFlaskUrl(),
  TIMEOUT: 120000,
};

const ENDPOINTS = {
  CHATBOT: '/api/chatbot',
  SOLVER: '/api/solver',
  CLEAR_SESSION: '/api/clear_session',
  HEALTH_CHECK: '/health',
};

const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  SERVER: 'SERVER_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

function inferFlaskUrl() {
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri || '';
    const match = String(hostUri).match(/(\d+\.\d+\.\d+\.\d+)/);
    return match ? `http://${match[1]}:5000` : 'http://127.0.0.1:5000';
  } catch {
    return 'http://127.0.0.1:5000';
  }
}

function fetchWithTimeout(url, options = {}, timeout = API_CONFIG.TIMEOUT) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout)),
  ]);
}

function buildUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

function isNetworkFailure(error) {
  const message = String(error?.message || error || '');
  return /failed to fetch|network request failed|network error|network/i.test(message);
}

function parseError(error, response = null) {
  const message = String(error?.message || error || '');

  if (message === 'Request timeout' || /timeout|aborted/i.test(message)) {
    return {
      type: ErrorTypes.TIMEOUT,
      message: 'The request took too long. Try a shorter voice note or a smaller file.',
      technicalError: message,
    };
  }

  if (/could not read|attachment|missing from device|empty/i.test(message)) {
    return {
      type: ErrorTypes.VALIDATION,
      message: message,
      technicalError: message,
    };
  }

  if (isNetworkFailure(error) || !response) {
    return {
      type: ErrorTypes.NETWORK,
      message: `Cannot reach Smart Learn at ${API_CONFIG.BASE_URL}. Start Flask and check the IP in .env.`,
      technicalError: message,
    };
  }

  const { status } = response;
  switch (status) {
    case 400:
      return { type: ErrorTypes.VALIDATION, message: 'Invalid request. Check the photo or voice note and try again.', technicalError: 'Bad Request', statusCode: status };
    case 413:
      return { type: ErrorTypes.VALIDATION, message: 'That file is too large. Try a shorter recording or a smaller file.', technicalError: 'Payload Too Large', statusCode: status };
    case 429:
      return { type: ErrorTypes.SERVER, message: 'Too many requests. Wait a moment and try again.', technicalError: 'Rate Limit Exceeded', statusCode: status };
    case 500:
    case 502:
    case 503:
    case 504:
      return { type: ErrorTypes.SERVER, message: 'The AI service is temporarily unavailable. Please try again.', technicalError: 'Server Error', statusCode: status };
    default:
      return { type: ErrorTypes.SERVER, message: 'An unexpected error occurred. Please try again.', technicalError: `HTTP ${status}`, statusCode: status };
  }
}

function validateMessageData(messageData) {
  if (!messageData) throw new Error('Message data is required');
  const hasText = messageData.text && messageData.text.trim().length > 0;
  const hasImages = messageData.images && messageData.images.length > 0;
  const hasAudio = Boolean(messageData.audioUri);
  const hasDocument = Boolean(messageData.documentUri);
  if (!hasText && !hasImages && !hasAudio && !hasDocument) {
    throw new Error('Send text, a photo, a voice note, or a document.');
  }
  return true;
}

function normalizeFileUri(uri) {
  if (!uri) return '';
  const value = String(uri);
  if (
    value.startsWith('file://') ||
    value.startsWith('content://') ||
    value.startsWith('ph://') ||
    value.startsWith('assets-library://') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }
  if (value.startsWith('/')) return `file://${value}`;
  return value;
}

function guessName(uri, fallback) {
  try {
    const part = String(uri).split('?')[0].split('/').pop();
    if (part && part.includes('.')) return decodeURIComponent(part);
  } catch {
    /* keep fallback */
  }
  return fallback;
}

function normalizeMime(mime, name, fallback) {
  const value = String(mime || '').toLowerCase();
  if (value === 'image/jpg') return 'image/jpeg';
  if (value && value !== 'application/octet-stream') return value;
  return mimeFromFileName(name, fallback);
}

async function readAttachment(uri, name, mime, fallbackName, fallbackMime) {
  const normalized = normalizeFileUri(uri);
  if (!normalized) {
    throw new Error('That attachment could not be read. Pick the file again.');
  }

  const finalName = name || guessName(normalized, fallbackName);
  const finalMime = normalizeMime(mime, finalName, fallbackMime);

  try {
    const file = new File(normalized);
    if (file.exists) {
      const base64 = await file.base64();
      if (!base64) throw new Error('That attachment is empty. Pick the file again.');
      return { base64, name: finalName, mime: finalMime };
    }
  } catch (error) {
    if (/empty/i.test(String(error?.message || ''))) throw error;
  }

  const FileSystem = require('expo-file-system/legacy');
  const info = await FileSystem.getInfoAsync(normalized);
  if (!info.exists) {
    throw new Error('That attachment is missing from device storage. Pick it again.');
  }
  const base64 = await FileSystem.readAsStringAsync(normalized, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) {
    throw new Error('That attachment is empty. Pick the file again.');
  }
  return { base64, name: finalName, mime: finalMime };
}

function appendEncodedFile(formData, field, attachment) {
  formData.append(`${field}_base64`, attachment.base64);
  formData.append(`${field}_name`, attachment.name);
  formData.append(`${field}_mime`, attachment.mime);
}

async function createChatFormData(messageData, conversationId, extras = {}) {
  const formData = new FormData();

  if (conversationId) formData.append('conversation_id', conversationId);
  if (extras.mode) formData.append('mode', extras.mode);
  if (extras.sessionMode) formData.append('session_mode', extras.sessionMode);
  if (messageData.text?.trim()) formData.append('message', messageData.text.trim());

  if (messageData.images?.[0]?.uri) {
    const image = messageData.images[0];
    appendEncodedFile(formData, 'image', await readAttachment(
      image.uri,
      image.fileName || image.name,
      image.mimeType || image.type,
      `image_${Date.now()}.jpg`,
      'image/jpeg'
    ));
  }

  if (messageData.audioUri) {
    appendEncodedFile(formData, 'audio', await readAttachment(
      messageData.audioUri,
      guessName(messageData.audioUri, `audio_${Date.now()}.m4a`),
      'audio/aac',
      `audio_${Date.now()}.m4a`,
      'audio/aac'
    ));
  }

  if (messageData.documentUri) {
    appendEncodedFile(formData, 'document', await readAttachment(
      messageData.documentUri,
      messageData.documentName,
      messageData.documentMimeType,
      `notes_${Date.now()}.pdf`,
      'application/pdf'
    ));
  }

  return formData;
}

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  return data;
}

const ApiService = {
  getBaseUrl: () => API_CONFIG.BASE_URL,

  healthCheck: async () => {
    const response = await fetchWithTimeout(buildUrl(ENDPOINTS.HEALTH_CHECK), { method: 'GET' }, 5000);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return response.json();
  },

  testConnection: async () => {
    try {
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.HEALTH_CHECK), { method: 'GET' }, 5000);
      return response.ok;
    } catch {
      return false;
    }
  },

  sendChatMessage: async (messageData, conversationId, extras = {}) => {
    try {
      validateMessageData(messageData);
      const formData = await createChatFormData(messageData, conversationId, extras);
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.CHATBOT), {
        method: 'POST',
        body: formData,
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const parsedError = parseError(new Error(data.error || 'Request failed'), response);
        return {
          success: false,
          error: parsedError.type,
          message: data.response || parsedError.message,
          technicalError: data.error || parsedError.technicalError,
          statusCode: response.status,
          data: null,
        };
      }

      if (data.status === 'error') {
        return {
          success: false,
          error: data.error || 'unknown_error',
          message: data.response || 'An error occurred while processing your request.',
          data,
        };
      }

      return {
        success: true,
        data: {
          response: data.response,
          conversation_id: data.conversation_id,
          conversation_title: data.conversation_title,
          processing_time: data.processing_time,
        },
        message: null,
        error: null,
      };
    } catch (error) {
      const parsedError = parseError(error);
      return {
        success: false,
        error: parsedError.type,
        message: parsedError.message,
        technicalError: parsedError.technicalError,
        data: null,
      };
    }
  },

  solveQuestion: async ({ image, question = '' }) => {
    const messageData = {
      type: image ? 'image' : 'text',
      text: question,
      images: image?.uri ? [image] : [],
    };
    try {
      validateMessageData(messageData);
      const formData = await createChatFormData(messageData, `solver_${Date.now()}`, { mode: 'solver' });
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.SOLVER), {
        method: 'POST',
        body: formData,
      });
      const payload = await parseJsonResponse(response);
      if (!response.ok || payload.status === 'error' || !payload.data) {
        return {
          success: false,
          message: payload.response || payload.error || `Cannot reach Smart Learn at ${API_CONFIG.BASE_URL}.`,
          data: null,
        };
      }
      return { success: true, data: payload.data };
    } catch (error) {
      const parsedError = parseError(error);
      return { success: false, message: parsedError.message, data: null };
    }
  },

  clearChatSession: async (conversationId) => {
    if (!conversationId) return { success: false };
    try {
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.CLEAR_SESSION), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId }),
      }, 8000);
      const data = await parseJsonResponse(response);
      return { success: data.status === 'success', message: data.message };
    } catch (error) {
      return { success: false, message: parseError(error).message };
    }
  },
};

export const aiApi = ApiService;
export { ErrorTypes, ENDPOINTS };
export default ApiService;
