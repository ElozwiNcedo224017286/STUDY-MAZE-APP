const test = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load-module.cjs');

function loadAi(fetch, storage = {}) {
  return loadModule('src/api/ai.js', {
    'expo-file-system': { File: class { exists = true; async base64() { return 'bWVkaWE='; } } },
    'expo-file-system/legacy': storage,
  }, { fetch }).aiApi;
}

test('video-only Voice Lab messages reach Flask with the correct attachment and speech request', async () => {
  let sent;
  const api = loadAi(async (url, options) => {
    sent = options.body;
    assert.ok(url.endsWith('/chatbot'));
    return { ok: true, json: async () => ({ status: 'success', response: 'Try adding an example.' }) };
  });
  const result = await api.sendChatMessage({ videoUri: 'file:///answer.mov', videoName: 'answer.mov' }, 'voice-test', { sessionMode: 'speaking', responseAudio: true });
  assert.equal(result.success, true);
  assert.equal(sent.get('video_mime'), 'video/mov');
  assert.equal(sent.get('video_base64'), 'bWVkaWE=');
  assert.equal(sent.get('session_mode'), 'speaking');
  assert.equal(sent.get('response_audio'), 'true');
});

test('audio storage failure preserves the successful transcript', async () => {
  const removed = [];
  const api = loadAi(async () => ({ ok: true, json: async () => ({
    status: 'success', response: 'Here is your speaking feedback.',
    response_audio_base64: 'UklGRg==', response_audio_mime: 'audio/wav',
  }) }), {
    cacheDirectory: 'file:///cache/', EncodingType: { Base64: 'base64' },
    writeAsStringAsync: async () => { throw new Error('Storage full'); },
    deleteAsync: async (uri) => removed.push(uri),
  });
  const result = await api.sendChatMessage({ text: 'Help me practise.' }, 'voice-test', { responseAudio: true });
  assert.equal(result.success, true);
  assert.equal(result.data.response, 'Here is your speaking feedback.');
  assert.equal(result.data.response_audio_uri, null);
  assert.equal(removed.length, 1);
});

test('an empty chat message is rejected before a network request', async () => {
  const api = loadAi(async () => { assert.fail('Unexpected network call'); });
  assert.equal((await api.sendChatMessage({ text: '  ' })).success, false);
});

test('QuizAPI questions require one unambiguous correct answer', () => {
  const { convertQuizAPIQuestion } = loadModule('src/api/questions.js', { './ai': { aiApi: {} } });
  const question = { id: 'one', text: 'Pick one', answers: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] };
  assert.equal(convertQuizAPIQuestion(question).correct, 0);
  assert.equal(convertQuizAPIQuestion({ ...question, answers: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] }), null);
  assert.equal(convertQuizAPIQuestion({ ...question, answers: [{ text: 'A' }, { text: 'B' }] }), null);
});
