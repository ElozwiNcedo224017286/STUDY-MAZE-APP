const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_FLASK_API_URL || inferFlaskUrl(),
  TIMEOUT: 90000,
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

function parseError(error, response = null) {
  if (error.message === 'Request timeout' || String(error.message || '').includes('timeout')) {
    return {
      type: ErrorTypes.TIMEOUT,
      message: 'The request took too long. Try a shorter voice note or a smaller file.',
      technicalError: error.message,
    };
  }

  if (error.message === 'Failed to fetch' || String(error.message || '').includes('Network') || !response) {
    return {
      type: ErrorTypes.NETWORK,
      message: `Cannot reach Smart Learn at ${API_CONFIG.BASE_URL}. Start Flask and check the IP in .env.`,
      technicalError: error.message,
    };
  }

  const { status } = response;
  switch (status) {
    case 400:
      return { type: ErrorTypes.VALIDATION, message: 'Invalid request. Check the photo or voice note and try again.', technicalError: 'Bad Request', statusCode: status };
    case 413:
      return { type: ErrorTypes.VALIDATION, message: 'That file is too large. Try a shorter recording.', technicalError: 'Payload Too Large', statusCode: status };
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

function getAudioFile(uri) {
  const lower = String(uri || '').toLowerCase();
  if (lower.includes('.wav')) {
    return { uri, type: 'audio/wav', name: `audio_${Date.now()}.wav` };
  }
  if (lower.includes('.mp3')) {
    return { uri, type: 'audio/mpeg', name: `audio_${Date.now()}.mp3` };
  }
  if (lower.includes('.webm')) {
    return { uri, type: 'audio/webm', name: `audio_${Date.now()}.webm` };
  }
  return { uri, type: 'audio/aac', name: `audio_${Date.now()}.m4a` };
}

function createChatFormData(messageData, conversationId, extras = {}) {
  const formData = new FormData();

  if (conversationId) formData.append('conversation_id', conversationId);
  if (extras.mode) formData.append('mode', extras.mode);
  if (extras.sessionMode) formData.append('session_mode', extras.sessionMode);
  if (messageData.text?.trim()) formData.append('message', messageData.text.trim());

  switch (messageData.type) {
    case 'image':
      if (messageData.images?.[0]?.uri) {
        const image = messageData.images[0];
        formData.append('image', {
          uri: image.uri,
          type: image.mimeType || image.type || 'image/jpeg',
          name: image.fileName || `image_${Date.now()}.jpg`,
        });
      }
      break;

    case 'audio':
      if (messageData.audioUri) {
        formData.append('audio', getAudioFile(messageData.audioUri));
      }
      break;

    case 'multimodal':
      if (messageData.images?.[0]?.uri) {
        const image = messageData.images[0];
        formData.append('image', {
          uri: image.uri,
          type: image.mimeType || image.type || 'image/jpeg',
          name: image.fileName || `image_${Date.now()}.jpg`,
        });
      }
      if (messageData.audioUri) {
        formData.append('audio', getAudioFile(messageData.audioUri));
      }
      break;

    case 'document':
      if (messageData.documentUri) {
        formData.append('document', {
          uri: messageData.documentUri,
          type: messageData.documentMimeType || 'application/pdf',
          name: messageData.documentName || `notes_${Date.now()}.pdf`,
        });
      }
      break;

    default:
      break;
  }

  if (messageData.audioUri && messageData.type !== 'audio' && messageData.type !== 'multimodal') {
    formData.append('audio', getAudioFile(messageData.audioUri));
  }
  if (messageData.documentUri && messageData.type !== 'document') {
    formData.append('document', {
      uri: messageData.documentUri,
      type: messageData.documentMimeType || 'application/pdf',
      name: messageData.documentName || `notes_${Date.now()}.pdf`,
    });
  }

  return formData;
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
      const formData = createChatFormData(messageData, conversationId, extras);
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.CHATBOT), {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

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
      const formData = createChatFormData(messageData, `solver_${Date.now()}`, { mode: 'solver' });
      const response = await fetchWithTimeout(buildUrl(ENDPOINTS.SOLVER), {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
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
      const data = await response.json().catch(() => ({}));
      return { success: data.status === 'success', message: data.message };
    } catch (error) {
      return { success: false, message: parseError(error).message };
    }
  },
};

export const aiApi = ApiService;
export { ErrorTypes, ENDPOINTS };
export default ApiService;
