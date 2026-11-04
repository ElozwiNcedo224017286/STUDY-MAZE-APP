import base64
import io
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from urllib.error import URLError

import app as backend


class MergeIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()
        backend.chat_sessions.clear()

    def test_health_includes_video_support(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertIn('video', response.json['inputs'])

    def test_empty_chat_is_rejected_without_calling_gemini(self):
        with patch.object(backend, 'new_chat') as create:
            self.assertEqual(self.client.post('/api/chatbot', data={}).status_code, 400)
            create.assert_not_called()

    def test_video_only_speaking_request_preserves_text_when_tts_fails(self):
        chat = Mock()
        chat.send_message.return_value = SimpleNamespace(text='Try explaining the example in your own words.')
        with patch.object(backend, 'new_chat', return_value=chat), \
             patch.object(backend, 'generate_speech', side_effect=RuntimeError('TTS unavailable')), \
             patch.object(backend, 'generate_conversation_title', return_value='Oral practice'):
            response = self.client.post('/api/chatbot', data={
                'conversation_id': 'video-test', 'session_mode': 'speaking', 'response_audio': 'true',
                'video_base64': base64.b64encode(b'\x00\x00\x00\x18ftypisomvideo').decode(),
                'video_name': 'answer.mp4', 'video_mime': 'video/mp4',
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'success')
        self.assertIn('example', response.json['response'])
        self.assertNotIn('response_audio_base64', response.json)
        parts = chat.send_message.call_args.args[0]
        self.assertTrue(any(getattr(getattr(part, 'inline_data', None), 'mime_type', '') == 'video/mp4' for part in parts))

    def test_successful_tts_is_attached_once(self):
        chat = Mock()
        chat.send_message.return_value = SimpleNamespace(text='Keep practising.')
        with patch.object(backend, 'new_chat', return_value=chat), \
             patch.object(backend, 'generate_speech', return_value=b'RIFFaudio') as speech, \
             patch.object(backend, 'generate_conversation_title', return_value='Practice'):
            response = self.client.post('/api/chatbot', data={
                'message': 'Help me practise my oral answer.', 'response_audio': 'true',
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(base64.b64decode(response.json['response_audio_base64']), b'RIFFaudio')
        speech.assert_called_once()

    def test_quiz_proxy_restricts_resources_and_handles_missing_configuration(self):
        with patch.dict(os.environ, {'QUIZAPI_KEY': ''}):
            self.assertEqual(self.client.get('/api/quiz/users').status_code, 404)
            self.assertEqual(self.client.get('/api/quiz/quizzes').status_code, 503)

    def test_quiz_proxy_limits_queries_and_keeps_the_provider_key_server_side(self):
        payload = {'success': True, 'data': [{'id': 'quiz-one', 'questionCount': 4}]}
        with patch.dict(os.environ, {'QUIZAPI_KEY': 'test-provider-key'}), \
             patch.object(backend, 'urlopen') as open_url:
            open_url.return_value.__enter__.return_value = io.BytesIO(json.dumps(payload).encode())
            response = self.client.get('/api/quiz/quizzes?topic=Science&limit=999&unsafe=ignored')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, payload)
        provider_request = open_url.call_args.args[0]
        self.assertIn('limit=50', provider_request.full_url)
        self.assertNotIn('unsafe', provider_request.full_url)
        self.assertEqual(provider_request.get_header('Authorization'), 'Bearer test-provider-key')
        self.assertNotIn('test-provider-key', response.get_data(as_text=True))

    def test_quiz_proxy_network_failure_is_recoverable(self):
        with patch.dict(os.environ, {'QUIZAPI_KEY': 'test-key'}), \
             patch.object(backend, 'urlopen', side_effect=URLError('Offline')):
            response = self.client.get('/api/quiz/questions')
        self.assertEqual(response.status_code, 502)
        self.assertIn('Built-in', response.json['error'])


if __name__ == '__main__':
    unittest.main()
