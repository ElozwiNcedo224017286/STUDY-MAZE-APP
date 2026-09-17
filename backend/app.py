from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from datetime import datetime
import os
import tempfile
import time
import base64
import zipfile
import traceback
from io import BytesIO
from xml.etree import ElementTree as ET
from dotenv import load_dotenv
import json
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import RequestEntityTooLarge

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)
load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=True)
load_dotenv(os.path.join(_ROOT_DIR, ".env"), override=True)

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024

INLINE_LIMIT = 18 * 1024 * 1024
# NcedoCare text model. Official Gemini 3.6 Flash inputs: text, image, audio, video, PDF.
# https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash
MODEL_NAME = (
    os.getenv("GEMINI_TEXT_MODEL")
    or os.getenv("GEMINI_MODEL")
    or "gemini-3.6-flash"
).strip()
TITLE_MODEL = (os.getenv("GEMINI_TITLE_MODEL") or MODEL_NAME).strip()


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({
        "error": "payload_too_large",
        "response": "That file is too large. Try a shorter recording or a smaller file.",
        "status": "error",
    }), 413


GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
client = None
if not GEMINI_API_KEY:
    print("\n!!! WARNING: GEMINI_API_KEY is missing !!!")
    print("Add it to backend/.env then restart Flask.\n")
else:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print(f"Gemini API key loaded (ends with ...{GEMINI_API_KEY[-4:]})")
    print(f"Gemini model: {MODEL_NAME}")

instructions_path = os.path.join(_BACKEND_DIR, "system_instructions.txt")
try:
    with open(instructions_path, "r", encoding="utf-8") as file:
        system_instruction = file.read()
except FileNotFoundError:
    system_instruction = (
        "You are Maze Mentor, the AI study coach inside Study Maze. "
        "Help students learn, revise, and prepare for quizzes and games. "
        "Stay on academic topics. Teach with clear steps."
    )

chat_sessions = {}


def require_client():
    if client is None:
        raise RuntimeError("GEMINI_API_KEY is missing. Add it to backend/.env and restart Flask.")
    return client


def thinking_config():
    return types.ThinkingConfig(
        thinking_level=types.ThinkingLevel.MINIMAL,
        include_thoughts=False,
    )


def chat_config(temperature=0.7, max_output_tokens=800, extra=None):
    kwargs = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "top_p": 0.95,
        "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True),
        "thinking_config": thinking_config(),
    }
    if extra:
        kwargs.update(extra)
    return types.GenerateContentConfig(**kwargs)


def new_chat():
    return require_client().chats.create(model=MODEL_NAME, config=chat_config())


def extract_text(response):
    try:
        text = getattr(response, "text", None)
        if text:
            return str(text).strip()
    except Exception as error:
        print(f"[gemini] response.text unavailable: {error}")

    chunks = []
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            if getattr(part, "thought", False):
                continue
            value = getattr(part, "text", None)
            if value:
                chunks.append(value)
    return "\n".join(chunks).strip()


def finish_reason(response):
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        prompt = getattr(response, "prompt_feedback", None)
        block = getattr(prompt, "block_reason", None) if prompt else None
        return str(block or "NO_CANDIDATES")
    return str(getattr(candidates[0], "finish_reason", "UNKNOWN"))


def detect_image_mime(filename, initial_bytes):
    if filename:
        name = filename.lower()
        if name.endswith((".jpg", ".jpeg")):
            return "image/jpeg"
        if name.endswith(".png"):
            return "image/png"
        if name.endswith(".webp"):
            return "image/webp"
        if name.endswith(".heic"):
            return "image/heic"
        if name.endswith(".heif"):
            return "image/heif"
    if initial_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if initial_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if initial_bytes.startswith(b"RIFF") and initial_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def detect_audio_mime(filename, initial_bytes=b""):
    header = initial_bytes or b""
    if len(header) >= 8 and header[4:8] == b"ftyp":
        return "audio/aac"
    if header.startswith(b"caff"):
        return "audio/aac"
    if header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return "audio/wav"
    if header.startswith(b"ID3") or header[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return "audio/webm"
    if header.startswith(b"OggS"):
        return "audio/ogg"

    name = (filename or "").lower()
    if name.endswith((".m4a", ".aac", ".caf", ".mp4")):
        return "audio/aac"
    if name.endswith(".wav"):
        return "audio/wav"
    if name.endswith(".mp3"):
        return "audio/mpeg"
    if name.endswith(".3gp"):
        return "audio/3gpp"
    if name.endswith(".ogg"):
        return "audio/ogg"
    if name.endswith(".webm"):
        return "audio/webm"
    return "audio/aac"


def detect_document_mime(filename):
    name = (filename or "").lower()
    if name.endswith(".txt"):
        return "text/plain"
    if name.endswith(".md"):
        return "text/markdown"
    if name.endswith(".csv"):
        return "text/csv"
    if name.endswith(".rtf"):
        return "text/rtf"
    if name.endswith(".doc"):
        return "application/msword"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if name.endswith(".ppt"):
        return "application/vnd.ms-powerpoint"
    if name.endswith(".pptx"):
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    if name.endswith(".xls"):
        return "application/vnd.ms-excel"
    if name.endswith(".xlsx"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if name.endswith(".odt"):
        return "application/vnd.oasis.opendocument.text"
    if name.endswith(".odp"):
        return "application/vnd.oasis.opendocument.presentation"
    return "application/pdf"


def file_from_request(field_name):
    uploaded = request.files.get(field_name)
    if uploaded and uploaded.filename:
        return uploaded

    raw = request.form.get(f"{field_name}_base64")
    if not raw:
        return None
    try:
        data = base64.b64decode(raw)
    except Exception:
        raise ValueError(f"{field_name}_upload_failed")
    if not data:
        return None
    filename = request.form.get(f"{field_name}_name") or f"{field_name}.bin"
    mime = request.form.get(f"{field_name}_mime") or "application/octet-stream"
    return FileStorage(stream=BytesIO(data), filename=filename, content_type=mime)


def gemini_image_mime(mime):
    value = (mime or "image/jpeg").split(";")[0].strip().lower()
    if value == "image/jpg":
        return "image/jpeg"
    if value in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"}:
        return value
    return "image/jpeg"


def gemini_audio_mime(mime):
    value = (mime or "audio/aac").split(";")[0].strip().lower()
    aliases = {
        "audio/mp4": "audio/aac",
        "audio/m4a": "audio/aac",
        "audio/x-m4a": "audio/aac",
        "audio/x-aac": "audio/aac",
        "audio/caf": "audio/aac",
        "audio/mpeg": "audio/mp3",
        "audio/x-wav": "audio/wav",
        "audio/wave": "audio/wav",
        "audio/vnd.wave": "audio/wav",
    }
    value = aliases.get(value, value)
    if value in {"audio/aac", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aiff"}:
        return value
    return "audio/aac"


def read_storage_bytes(file_storage):
    file_storage.seek(0)
    data = file_storage.read()
    file_storage.seek(0)
    return data or b""


def extract_openxml_text(data, kind):
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            if kind == "docx":
                names = ["word/document.xml"]
            elif kind == "pptx":
                names = sorted(
                    name for name in archive.namelist()
                    if name.startswith("ppt/slides/slide") and name.endswith(".xml")
                )
            elif kind == "xlsx":
                names = [
                    name for name in archive.namelist()
                    if name.startswith("xl/") and name.endswith(".xml")
                    and "printerSettings" not in name
                ]
            else:
                return None
            chunks = []
            for name in names:
                if name not in archive.namelist():
                    continue
                root = ET.fromstring(archive.read(name))
                for element in root.iter():
                    if element.text and element.text.strip():
                        chunks.append(element.text.strip())
            return "\n".join(chunks).strip()
    except Exception as error:
        print(f"[docs] could not extract {kind}: {error}")
        return None


def document_part(file_storage):
    filename = file_storage.filename or "notes.pdf"
    suffix = os.path.splitext(filename)[1].lower() or ".pdf"
    mime = detect_document_mime(filename)
    data = read_storage_bytes(file_storage)
    if not data:
        return None

    if mime == "application/pdf" or suffix == ".pdf":
        print(f"[docs] PDF {filename} ({len(data)} bytes)")
        return part_from_bytes(data, "application/pdf", ".pdf")

    if mime.startswith("text/") or suffix in {".txt", ".md", ".csv", ".rtf"}:
        text = data.decode("utf-8", errors="replace").strip()
        if not text:
            return None
        print(f"[docs] text {filename} ({len(text)} chars)")
        return f"Study material from {filename}:\n{text[:80000]}"

    kind = {".docx": "docx", ".pptx": "pptx", ".xlsx": "xlsx"}.get(suffix)
    if kind:
        extracted = extract_openxml_text(data, kind)
        if extracted:
            print(f"[docs] extracted {kind} {filename} ({len(extracted)} chars)")
            return f"Study material extracted from {filename}:\n{extracted[:80000]}"
        raise ValueError("document_error")

    if suffix in {".doc", ".ppt", ".xls", ".odt", ".odp"}:
        raise ValueError("document_unsupported")

    print(f"[docs] treating {filename} as PDF")
    return part_from_bytes(data, "application/pdf", ".pdf")


def part_from_bytes(data, mime_type, suffix):
    if not data:
        return None
    if len(data) <= INLINE_LIMIT:
        return types.Part.from_bytes(data=data, mime_type=mime_type)

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(data)
            temp_path = temp_file.name
        uploaded = require_client().files.upload(
            file=temp_path,
            config=types.UploadFileConfig(mime_type=mime_type),
        )
        return uploaded
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass


def part_from_storage(file_storage, mime_type, suffix):
    return part_from_bytes(read_storage_bytes(file_storage), mime_type, suffix)


def is_substantive_message(text, has_media):
    if has_media:
        return True
    if not text:
        return False
    cleaned = text.strip().lower()
    short_phrases = {
        "hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "yes", "no",
        "thanks.", "thank you.", "okay.", "yes.", "no.", "hi there", "hello there",
    }
    if cleaned in short_phrases:
        return False
    return len(cleaned.split()) >= 3


def generate_conversation_title(user_input, ai_response_text, has_media, has_audio):
    if has_audio and not (user_input or "").strip():
        return "Voice Session"
    if has_media and not (user_input or "").strip():
        return "Study Material"
    words = (user_input or "").strip().split()
    if len(words) >= 2:
        return " ".join(words[:4]).title()[:40]
    return (user_input or "Study session").strip()[:30].title() or "New Conversation"


def build_content_parts(user_input, image_file, audio_file, document_file, mode):
    content_parts = []

    if image_file:
        header = read_storage_bytes(image_file)[:12]
        mime = gemini_image_mime(detect_image_mime(image_file.filename, header))
        print(f"[chatbot] image mime={mime}")
        part = part_from_storage(image_file, mime, ".jpg")
        if not part:
            raise ValueError("image_upload_failed")
        content_parts.append(part)

    if audio_file:
        header = read_storage_bytes(audio_file)[:16]
        mime = gemini_audio_mime(detect_audio_mime(audio_file.filename, header))
        suffix = ".m4a" if mime == "audio/aac" else (os.path.splitext(audio_file.filename or "")[1] or ".m4a")
        print(f"[chatbot] audio mime={mime}")
        part = part_from_storage(audio_file, mime, suffix)
        if not part:
            raise ValueError("audio_processing_failed")
        if not user_input:
            if image_file:
                content_parts.insert(0, "Listen to the student and look at the attached image. Teach from both.")
            else:
                content_parts.insert(0, "Listen to this student voice note and reply as Maze Mentor. Stay on study goals.")
        content_parts.append(part)

    if document_file:
        part = document_part(document_file)
        if not part:
            raise ValueError("document_error")
        content_parts.append(part)

    if user_input:
        if (image_file or document_file) and not audio_file:
            content_parts.insert(0, f"Student question about the attached study content: {user_input}")
        elif not image_file and not audio_file and not document_file:
            content_parts.append(user_input)
        elif audio_file:
            content_parts.insert(0, user_input)
    elif image_file and not audio_file:
        if mode == "solver":
            content_parts.insert(
                0,
                "Solve the academic question in this image. Show the question, steps, final answer, and one memory tip.",
            )
        else:
            content_parts.insert(
                0,
                "Study this image with the student. If it is a question, teach the method. If it is notes, summarise and quiz them.",
            )
    elif document_file and not audio_file:
        content_parts.insert(
            0,
            "Use this uploaded study material as session context. Summarise the key ideas and ask one check question.",
        )

    return content_parts


def public_error(error):
    message = str(error).lower()
    if "api key" in message or "permission" in message or "unauthenticated" in message:
        return "Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env."
    if "quota" in message or "rate" in message or "resource exhausted" in message:
        return "Maze Mentor is busy right now. Wait a moment and try again."
    if "not found" in message or "is not found" in message:
        return f"Gemini model {MODEL_NAME} is not available for this key. Set GEMINI_MODEL=gemini-3.6-flash in backend/.env."
    if "network" in message or "connection" in message:
        return "I cannot reach Gemini. Check the backend internet connection."
    if "timeout" in message:
        return "That took too long. Try a shorter message or a smaller file."
    if "datapart" in message or "unsupported" in message or "mime" in message:
        return "I could not read that attachment. Try another file format."
    if "safety" in message or "blocked" in message:
        return "Gemini blocked that request. Try a clearer study question."
    return "Maze Mentor hit an unexpected issue. Check the Flask window for the error."


def run_chat(mode="tutor"):
    start_time = time.time()
    try:
        user_input = (request.form.get("message") or "").strip()
        conversation_id = request.form.get("conversation_id") or ""
        session_mode = request.form.get("session_mode") or "general"
        audio_file = file_from_request("audio")
        image_file = file_from_request("image")
        document_file = file_from_request("document")
        print(
            f"[chatbot] text={bool(user_input)} audio={bool(audio_file)} "
            f"image={bool(image_file)} document={bool(document_file)}"
        )

        if not user_input and not audio_file and not image_file and not document_file:
            return jsonify({
                "error": "no_input",
                "response": "Send a message, voice note, photo, or document to continue.",
                "status": "error",
            }), 400

        if not conversation_id:
            conversation_id = f"conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        if conversation_id not in chat_sessions:
            chat_sessions[conversation_id] = {
                "chat": new_chat(),
                "title": None,
                "session_mode": session_mode,
            }

        session = chat_sessions[conversation_id]
        content_parts = build_content_parts(
            user_input, image_file, audio_file, document_file, mode
        )
        if not content_parts:
            raise ValueError("no_input")

        requested_max_tokens = request.form.get("max_tokens")
        max_tokens = 800
        if requested_max_tokens:
            try:
                max_tokens = min(int(requested_max_tokens), 2048)
            except (ValueError, TypeError):
                pass

        payload = content_parts[0] if len(content_parts) == 1 else content_parts
        response = session["chat"].send_message(
            payload,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=max_tokens,
                top_p=0.95,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                thinking_config=thinking_config(),
            ),
        )
        response_text = extract_text(response)
        if not response_text:
            reason = finish_reason(response)
            print(f"[chatbot] empty Gemini response finish_reason={reason}")
            raise RuntimeError(f"Gemini returned no text ({reason})")

        processing_time = time.time() - start_time
        print(f"[chatbot] reply {len(response_text)} chars in {processing_time:.2f}s")
        has_media = image_file is not None or document_file is not None
        has_audio = audio_file is not None

        conversation_title = session["title"]
        if conversation_title is None and is_substantive_message(user_input, has_media or has_audio):
            conversation_title = generate_conversation_title(
                user_input, response_text, has_media, has_audio
            )
            session["title"] = conversation_title

        return jsonify({
            "response": response_text,
            "conversation_id": conversation_id,
            "conversation_title": conversation_title,
            "status": "success",
            "processing_time": round(processing_time, 2),
        }), 200
    except ValueError as error:
        code = str(error)
        messages = {
            "no_input": "Send a message, voice note, photo, or document to continue.",
            "image_upload_failed": "I could not read that image. Try JPEG or PNG.",
            "audio_upload_failed": "I could not process that voice note. Please try again.",
            "audio_processing_failed": "I could not process that voice note. Please try again.",
            "document_upload_failed": "I could not read that file. Try PDF, Word, PowerPoint, or TXT.",
            "document_error": "I could not read that file. Try PDF, Word, PowerPoint, or TXT.",
            "document_unsupported": "That older file format is not supported. Save it as PDF, DOCX, or PPTX and try again.",
        }
        return jsonify({
            "error": code,
            "response": messages.get(code, "Something went wrong with the attachment."),
            "status": "error",
        }), 400
    except Exception as error:
        traceback.print_exc()
        print(f"[chatbot] ERROR {type(error).__name__}: {error}")
        return jsonify({
            "error": type(error).__name__,
            "response": public_error(error),
            "status": "error",
            "processing_time": round(time.time() - start_time, 2),
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "message": "Study Maze Smart Learn API is running",
        "model": MODEL_NAME,
        "sdk": "google-genai",
        "inputs": ["text", "image", "audio", "pdf"],
        "timestamp": datetime.now().isoformat(),
    }), 200


@app.route("/api/chatbot", methods=["POST"])
def chatbot_response():
    return run_chat(mode=request.form.get("mode") or "tutor")


SOLVER_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "subject": {"type": "string"},
        "difficulty": {"type": "string"},
        "confidence": {"type": "integer"},
        "steps": {"type": "array", "items": {"type": "string"}},
        "final_answer": {"type": "string"},
        "check": {"type": "string"},
        "tip": {"type": "string"},
    },
    "required": [
        "question",
        "subject",
        "difficulty",
        "confidence",
        "steps",
        "final_answer",
        "check",
        "tip",
    ],
}


@app.route("/api/solver", methods=["POST"])
def solver_response():
    start_time = time.time()
    try:
        user_input = (request.form.get("message") or "").strip()
        image_file = file_from_request("image")
        if not user_input and not image_file:
            return jsonify({
                "error": "no_input",
                "response": "Add a photo or type the question first.",
                "status": "error",
            }), 400

        parts = []
        if image_file:
            image_file.seek(0)
            header = image_file.read(12)
            image_file.seek(0)
            mime = gemini_image_mime(detect_image_mime(image_file.filename, header))
            print(f"[solver] image mime={mime}")
            part = part_from_storage(image_file, mime, ".jpg")
            if not part:
                raise ValueError("image_upload_failed")
            parts.append(part)
        parts.append(
            (user_input + "\n\n" if user_input else "")
            + "Solve the academic question. If more than one appears, solve the clearest one first. "
            "Write maths as LaTeX with $...$ or $$...$$, using \\frac{a}{b}. "
            "Return JSON only: question, subject (MATH/SCIENCE/ENGLISH/HISTORY/OTHER), "
            "difficulty (Easy/Medium/Hard), confidence 0-100, 3-8 short teaching steps, "
            "final_answer, check, and tip."
        )

        response = require_client().models.generate_content(
            model=MODEL_NAME,
            contents=parts,
            config=chat_config(
                temperature=0.3,
                max_output_tokens=1600,
                extra={
                    "response_mime_type": "application/json",
                    "response_schema": SOLVER_SCHEMA,
                },
            ),
        )
        raw = extract_text(response)
        if not raw:
            raise RuntimeError(f"Gemini returned no solver JSON ({finish_reason(response)})")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}")
            if start < 0 or end <= start:
                raise
            parsed = json.loads(raw[start:end + 1])
        return jsonify({
            "status": "success",
            "data": parsed,
            "processing_time": round(time.time() - start_time, 2),
        }), 200
    except ValueError as error:
        return jsonify({
            "error": str(error),
            "response": "I could not read that image. Try a clearer JPEG or PNG.",
            "status": "error",
        }), 400
    except Exception as error:
        traceback.print_exc()
        print(f"[solver] ERROR {type(error).__name__}: {error}")
        return jsonify({
            "error": type(error).__name__,
            "response": public_error(error),
            "status": "error",
            "processing_time": round(time.time() - start_time, 2),
        }), 500


@app.route("/api/clear_session", methods=["POST"])
def clear_session():
    data = request.get_json(silent=True) or {}
    conversation_id = data.get("conversation_id")
    if conversation_id and conversation_id in chat_sessions:
        del chat_sessions[conversation_id]
        return jsonify({"status": "success", "message": "Session cleared"}), 200
    return jsonify({"status": "error", "message": "Session not found"}), 404


if __name__ == "__main__":
    print("Study Maze Smart Learn backend → http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
