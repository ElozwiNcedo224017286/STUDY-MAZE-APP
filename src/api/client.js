import Constants from 'expo-constants';

// Configure this in app.json -> expo.extra.apiBaseUrl, or override here.
// On a physical device this must be your computer's LAN IP, not "localhost".
const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (username, password, role, teacherCode) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, role, teacherCode }) }),

  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getUser: (username) => request(`/users/${encodeURIComponent(username)}`),

  updateUser: (username, patch) =>
    request(`/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(patch) }),

  getQuizBank: () => request('/quiz'),

  publishQuizBank: (teacher, topic, questions) =>
    request('/quiz/publish', { method: 'POST', body: JSON.stringify({ teacher, topic, questions }) }),

  clearQuizBank: () => request('/quiz', { method: 'DELETE' }),

  generateQuestions: async (files, topic) => {
    const form = new FormData();
    files.forEach((f) => {
      form.append('files', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
    });
    form.append('topic', topic || '');
    const res = await fetch(BASE_URL + '/upload/generate', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Question generation failed.');
    return data;
  },

  baseUrl: BASE_URL
};
