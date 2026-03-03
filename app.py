from flask import Flask, request, send_file, jsonify, render_template
from speech_engine import generate_edge_speech, get_voices
import json
import os
import uuid as _uuid

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

@app.after_request
def no_cache(response):
    # Don't add no-cache headers to actual file downloads
    if request.path.startswith('/get-audio/'):
        return response
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

HISTORY_FILE = "history.json"

# ── In-memory history (also persisted to disk) ──
_history = []

def _load_history():
    global _history
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                _history = json.load(f)
    except Exception:
        _history = []

def _save_history():
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(_history, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

_load_history()

# ── Temporary audio cache for downloads ──
_audio_cache = {}  # file_id -> filepath



@app.route("/")
def home():
    return render_template("index.html")


@app.route("/voices")
def voices():
    return jsonify(get_voices())


@app.route("/generate", methods=["POST"])
def generate_audio():
    global _history
    data      = request.json
    text      = data.get("text", "").strip()
    speed     = int(data.get("speed", 150))
    volume    = max(0, min(100, int(data.get("volume", 80))))
    language  = data.get("language", "en")
    gender    = data.get("gender", "female")   # "male" or "female"

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        filepath = generate_edge_speech(text, language, gender)
        actual_mode = f"Edge TTS · {gender}"
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    download_mode = data.get("download", False)

    # Save to history
    word_count = len(text.split())
    preview    = text[:80] + ("..." if len(text) > 80 else "")
    _history.insert(0, {
        "text":       text,
        "preview":    preview,
        "word_count": word_count,
        "language":   language,
        "mode":       actual_mode
    })
    _history = _history[:20]
    _save_history()

    if download_mode:
        # Store filepath and return a one-time download URL
        short_id = str(_uuid.uuid4())[:8]
        _audio_cache[short_id] = os.path.abspath(filepath)
        return jsonify({"download_url": f"/get-audio/{short_id}", "filename": f"vocalize-{short_id}.mp3"})
    else:
        return send_file(os.path.abspath(filepath), mimetype="audio/mpeg", as_attachment=False)


@app.route("/download-file", methods=["POST"])
def download_file():
    """Direct file download via form POST — most reliable cross-browser method."""
    text     = request.form.get("text", "").strip()
    language = request.form.get("language", "en")
    gender   = request.form.get("gender", "female")

    if not text:
        return "No text provided", 400

    short_id = str(_uuid.uuid4())[:8]

    try:
        filepath = generate_edge_speech(text, language, gender)
    except Exception as e:
        return str(e), 500

    # Save to history
    word_count = len(text.split())
    preview    = text[:80] + ("..." if len(text) > 80 else "")
    _history.insert(0, {
        "text":       text,
        "preview":    preview,
        "word_count": word_count,
        "language":   language,
        "mode":       f"Edge TTS · {gender}"
    })
    _history[:] = _history[:20]
    _save_history()

    return send_file(
        os.path.abspath(filepath),
        mimetype="audio/mpeg",
        as_attachment=True,
        download_name=f"vocalize-{short_id}.mp3"
    )


@app.route("/history")
def get_history():
    return jsonify(_history)


@app.route("/clear_history", methods=["POST"])
def clear_history():
    global _history
    _history = []
    _save_history()
    return jsonify({"status": "cleared"})


@app.route("/translate", methods=["POST"])
def translate_text():
    data        = request.json
    text        = data.get("text", "")
    target_lang = data.get("target", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source="auto", target=target_lang).translate(text)
        return jsonify({"translated": translated})
    except Exception as e:
        return jsonify({"error": str(e), "translated": text}), 200


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
