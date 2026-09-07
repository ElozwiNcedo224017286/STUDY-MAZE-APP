from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from datetime import datetime
import os
import tempfile
import time
import base64
from io import BytesIO
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


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({
        "error": "payload_too_large",
        "response": "That file is too large. Try a shorter recording or a smaller file.",
        "status": "error",
    }), 413

GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
if not GEMINI_API_KEY:
    print("\n!!! WARNING: GEMINI_API_KEY is missing !!!")
    print("Add it to backend/.env then restart Flask.\n")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"Gemini API key loaded (ends with ...{GEMINI_API_KEY[-4:]})")

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

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=system_instruction,
)

chat_sessions = {}


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


def wait_until_active(uploaded, timeout=45):
    current = uploaded
    start = time.time()
    while getattr(getattr(current, "state", None), "name", "") == "PROCESSING":
        if time.time() - start > timeout:
            break
        time.sleep(0.4)
        current = genai.get_file(current.name)
    return current


def upload_temp_file(file_storage, suffix, mime_type):
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            file_storage.seek(0)
            data = file_storage.read()
            temp_file.write(data)
            temp_path = temp_file.name
        uploaded = genai.upload_file(path=temp_path, mime_type=mime_type)
        return wait_until_active(uploaded)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass


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
    try:
        user_text = user_input.strip()[:100] if user_input else ""
        ai_text = (ai_response_text or "").strip()[:150]
        prompt = (
            "Based on this Study Maze tutoring conversation, generate a specific title in 2-4 words. "
            f"Context: User: {user_text} | AI: {ai_text}"
        )
        title_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            system_instruction=(
                "You are a concise title generator for student study chats. "
                "Output ONLY a 2-4 word title. Examples: 'Algebra Practice', "
                "'Photosynthesis Recap', 'Quiz Rush Prep'."
            ),
        )
        response = title_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0,
                max_output_tokens=10,
            ),
        )
        if not response.parts:
            raise Exception("Title generation returned empty response")
        title = response.text.strip().strip('"').strip("'")
        for char in ".:!?":
            title = title.replace(char, "")
        final_title = " ".join(title.split()[:4]).title()
        if not final_title:
            raise Exception("Empty title")
        return final_title
    except Exception as error:
        print(f"Title generation error: {error}")
        if has_media and not has_audio:
            return "Study Material"
        if has_audio:
            return "Voice Session"
        return (user_input or "Study session").strip()[:30].title() or "New Conversation"


def build_content_parts(user_input, image_file, audio_file, document_file, mode):
    content_parts = []

    if image_file:
        image_file.seek(0)
        header = image_file.read(12)
        image_file.seek(0)
        mime = detect_image_mime(image_file.filename, header)
        uploaded = upload_temp_file(image_file, ".jpg", mime)
        if not uploaded:
            raise ValueError("image_upload_failed")
        content_parts.append(uploaded)

    if audio_file:
        audio_file.seek(0)
        header = audio_file.read(16)
        audio_file.seek(0)
        mime = detect_audio_mime(audio_file.filename, header)
        suffix = ".m4a" if mime == "audio/aac" else (os.path.splitext(audio_file.filename or "")[1] or ".m4a")
        uploaded = upload_temp_file(audio_file, suffix, mime)
        if not uploaded:
            raise ValueError("audio_processing_failed")
        if not user_input:
            if image_file:
                content_parts.insert(
                    0,
                    "Listen to the student and look at the attached image. Teach from both.",
                )
            else:
                content_parts.insert(
                    0,
                    "Listen to this student voice note and reply as Maze Mentor. Stay on study goals.",
                )
        content_parts.append(uploaded)

    if document_file:
        filename = document_file.filename or "notes.pdf"
        suffix = os.path.splitext(filename)[1] or ".pdf"
        mime = detect_document_mime(filename)
        uploaded = upload_temp_file(document_file, suffix, mime)
        if not uploaded:
            raise ValueError("document_error")
        content_parts.append(uploaded)

    if user_input:
        if (image_file or document_file) and not audio_file:
            content_parts.insert(0, f"Student question about the attached study content: {user_input}")
        elif not image_file and not audio_file and not document_file:
            content_parts.append(user_input)
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
                "chat": model.start_chat(),
                "title": None,
                "session_mode": session_mode,
            }

        session = chat_sessions[conversation_id]
        content_parts = build_content_parts(
            user_input, image_file, audio_file, document_file, mode
        )

        requested_max_tokens = request.form.get("max_tokens")
        max_tokens = 900 if mode == "tutor" else 1400
        if requested_max_tokens:
            try:
                max_tokens = min(int(requested_max_tokens), 4096)
            except (ValueError, TypeError):
                pass

        response = session["chat"].send_message(
            content=content_parts,
            generation_config=genai.types.GenerationConfig(
                temperature=0.6 if mode == "solver" else 0.7,
                max_output_tokens=max_tokens,
                top_p=0.95,
                top_k=40,
            ),
        )
        response_text = response.text
        processing_time = time.time() - start_time
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
            "image_upload_failed": "I could not read that image. Try JPEG or PNG.",
            "audio_upload_failed": "I could not process that voice note. Please try again.",
            "audio_processing_failed": "I could not process that voice note. Please try again.",
            "document_upload_failed": "I could not read that file. Try PDF, Word, PowerPoint, or TXT.",
            "document_error": "I could not read that file. Try PDF, Word, PowerPoint, or TXT.",
        }
        return jsonify({
            "error": code,
            "response": messages.get(code, "Something went wrong with the attachment."),
            "status": "error",
        }), 400
    except Exception as error:
        message = str(error).lower()
        if "quota" in message or "rate" in message:
            user_message = "Maze Mentor is busy right now. Wait a moment and try again."
        elif "network" in message or "connection" in message:
            user_message = "I cannot reach Gemini. Check the backend internet connection."
        elif "timeout" in message:
            user_message = "That took too long. Try a shorter message or a smaller file."
        elif "datapart" in message or "unsupported" in message or "mime" in message:
            user_message = "I could not read that voice note. Please record again and send it once more."
        else:
            user_message = "Maze Mentor hit an unexpected issue. Please try again."
        return jsonify({
            "error": type(error).__name__,
            "response": user_message,
            "status": "error",
            "processing_time": round(time.time() - start_time, 2),
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "message": "Study Maze Smart Learn API is running",
        "model": "gemini-2.5-flash",
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
            mime = detect_image_mime(image_file.filename, header)
            uploaded = upload_temp_file(image_file, ".jpg", mime)
            if not uploaded:
                raise ValueError("image_upload_failed")
            parts.append(uploaded)
        parts.append(
            (user_input + "\n\n" if user_input else "")
            + "Solve the academic question. If more than one appears, solve the clearest one first. "
            "Return JSON only: question, subject (MATH/SCIENCE/ENGLISH/HISTORY/OTHER), "
            "difficulty (Easy/Medium/Hard), confidence 0-100, 3-8 short teaching steps, "
            "final_answer, check, and tip."
        )

        response = model.generate_content(
            parts,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1600,
                response_mime_type="application/json",
                response_schema=SOLVER_SCHEMA,
            ),
        )
        raw = (response.text or "").strip()
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
        return jsonify({
            "error": type(error).__name__,
            "response": "Smart Solver could not finish. Check Gemini and try again.",
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
