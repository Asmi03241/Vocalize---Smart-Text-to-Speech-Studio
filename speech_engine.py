import pyttsx3
import edge_tts
import asyncio
import uuid
import os

AUDIO_FOLDER = "audio"

if not os.path.exists(AUDIO_FOLDER):
    os.makedirs(AUDIO_FOLDER)

# ── Edge TTS voice map (language → male/female Microsoft Neural voices) ──
EDGE_VOICES = {
    "en":    {"male": "en-US-GuyNeural",       "female": "en-US-JennyNeural"},
    "hi":    {"male": "hi-IN-MadhurNeural",    "female": "hi-IN-SwaraNeural"},
    "mr":    {"male": "mr-IN-ManoharNeural",   "female": "mr-IN-AarohiNeural"},
    "fr":    {"male": "fr-FR-HenriNeural",     "female": "fr-FR-DeniseNeural"},
    "es":    {"male": "es-ES-AlvaroNeural",    "female": "es-ES-ElviraNeural"},
    "de":    {"male": "de-DE-ConradNeural",    "female": "de-DE-KatjaNeural"},
    "ja":    {"male": "ja-JP-KeitaNeural",     "female": "ja-JP-NanamiNeural"},
    "zh-CN": {"male": "zh-CN-YunxiNeural",     "female": "zh-CN-XiaoxiaoNeural"},
    "ar":    {"male": "ar-SA-HamedNeural",     "female": "ar-SA-ZariyahNeural"},
}


def _get_engine():
    """Create a fresh pyttsx3 engine instance each call to avoid threading issues."""
    return pyttsx3.init()


def get_voices():
    """Return list of available Windows TTS voice names (for English offline)."""
    engine = _get_engine()
    voices = engine.getProperty("voices")
    result = []
    for i, v in enumerate(voices):
        name = v.name if v.name else f"Voice {i}"
        label = name.replace("Microsoft ", "").replace(" Desktop", "")
        result.append({"index": i, "name": label, "id": v.id})
    engine.stop()
    return result


def generate_offline_speech(text, voice_idx=0, rate=150, volume=80):
    """Generate speech using pyttsx3 (English only)."""
    engine = _get_engine()
    voices = engine.getProperty("voices")

    if voices and 0 <= voice_idx < len(voices):
        engine.setProperty("voice", voices[voice_idx].id)

    engine.setProperty("rate", rate)
    engine.setProperty("volume", max(0.0, min(1.0, volume / 100.0)))

    filename = f"{AUDIO_FOLDER}/{uuid.uuid4()}.mp3"
    engine.save_to_file(text, filename)
    engine.runAndWait()
    engine.stop()
    return filename


def generate_edge_speech(text, lang="en", gender="female"):
    """Generate speech using Microsoft Edge TTS — supports all languages with male/female voices."""
    lang_voices = EDGE_VOICES.get(lang, EDGE_VOICES["en"])
    voice_name = lang_voices.get(gender, lang_voices.get("female"))

    filename = f"{AUDIO_FOLDER}/{uuid.uuid4()}.mp3"

    async def _run():
        communicate = edge_tts.Communicate(text, voice_name)
        await communicate.save(filename)

    asyncio.run(_run())
    return filename


def generate_online_speech(text, lang="en"):
    """Legacy gTTS fallback — kept for compatibility."""
    from gtts import gTTS
    tts = gTTS(text=text, lang=lang, slow=False)
    filename = f"{AUDIO_FOLDER}/{uuid.uuid4()}.mp3"
    tts.save(filename)
    return filename