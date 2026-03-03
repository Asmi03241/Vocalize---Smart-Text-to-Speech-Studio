/* =============================================
   VOCALIZE — SCRIPT.JS
   All features: theme, TTS, download, voice,
   speed, language, translation, history
   ============================================= */

// ── DOM refs ──────────────────────────────────
const textInput = document.getElementById('textInput');
const wordCountEl = document.getElementById('wordCount');
const voiceSelect = document.getElementById('voice');
const speedSlider = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const languageSelect = document.getElementById('language');
const volumeSlider = document.getElementById('volume');
const volumeValEl = document.getElementById('volumeVal');
const speakBtn = document.getElementById('speakBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const translateBtn = document.getElementById('translateBtn');
const fileUpload = document.getElementById('fileUpload');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const statusBar = document.getElementById('statusBar');

// ── Theme ─────────────────────────────────────
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.remove('light');
        themeIcon.textContent = '🌙';
    } else {
        document.body.classList.add('light');
        themeIcon.textContent = '☀️';
    }
}

// Persist preference
let darkMode = localStorage.getItem('theme') !== 'light';
applyTheme(darkMode);

themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    applyTheme(darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
});

// ── Word Counter ──────────────────────────────
function updateWordCount() {
    const words = textInput.value.trim().split(/\s+/).filter(Boolean);
    wordCountEl.textContent = words.length;
}
textInput.addEventListener('input', updateWordCount);

// ── Speed slider display ──────────────────────
speedSlider.addEventListener('input', () => {
    speedVal.textContent = speedSlider.value;
});

// ── Volume slider display ─────────────────────
volumeSlider.addEventListener('input', () => {
    volumeValEl.textContent = volumeSlider.value;
});

// ── Status helper ─────────────────────────────
let statusTimer = null;
function setStatus(msg, type = 'info', duration = 4000) {
    statusBar.textContent = msg;
    statusBar.className = 'status-bar ' + type;
    clearTimeout(statusTimer);
    if (duration > 0) {
        statusTimer = setTimeout(() => {
            statusBar.textContent = '';
            statusBar.className = 'status-bar';
        }, duration);
    }
}

// ── Load voices from backend ──────────────────
async function loadVoices() {
    try {
        const res = await fetch('/voices');
        const voices = await res.json();
        voiceSelect.innerHTML = '';
        if (!voices || voices.length === 0) {
            voiceSelect.innerHTML = '<option value="0">Default Voice</option>';
            return;
        }
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.index;

            // Parse "Microsoft David Desktop - English (United States)"
            // → gender prefix + name + region
            const raw = v.name || '';
            const lower = raw.toLowerCase();

            // Detect gender
            let gender = 'Voice';
            const femaleNames = ['zira', 'hazel', 'heather', 'susan', 'helen', 'eva', 'sabina', 'hortense'];
            const maleNames = ['david', 'mark', 'george', 'richard', 'stefan', 'pablo'];
            if (femaleNames.some(n => lower.includes(n))) gender = 'Female';
            else if (maleNames.some(n => lower.includes(n))) gender = 'Male';

            // Extract voice first name (word after "Microsoft " or first word)
            let voiceName = raw.replace(/Microsoft\s+/i, '').replace(/\s+Desktop/i, '');
            // Split on " - " → left is name, right is locale
            const parts = voiceName.split(' - ');
            const name = parts[0].trim();        // e.g. "David"
            const locale = parts[1] ? parts[1].replace(/^English\s*/i, '').trim() : ''; // e.g. "(United States)"

            opt.textContent = locale
                ? `${gender} – ${name} ${locale}`
                : `${gender} – ${name}`;
            voiceSelect.appendChild(opt);
        });
    } catch (e) {
        voiceSelect.innerHTML = '<option value="0">Default Voice</option>';
    }
}

// ── Build payload ─────────────────────────────
function getPayload(text) {
    return {
        text: text,
        gender: voiceSelect?.value || 'female',
        speed: parseInt(speedSlider.value) || 150,
        volume: parseInt(volumeSlider.value) || 80,
        language: languageSelect.value
    };
}

// ── Set button loading state ──────────────────
function setBusy(btn, busy, originalHTML) {
    if (busy) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> ${btn.textContent.trim()}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ── Generate audio (speak or download) ────────
const speakBtnHTML = speakBtn.innerHTML;
const downloadBtnHTML = downloadBtn.innerHTML;

async function generate(forDownload, customText) {
    const text = customText !== undefined ? customText : textInput.value.trim();
    if (!text) {
        setStatus('⚠️ Please enter some text first.', 'err');
        return;
    }

    const btn = forDownload ? downloadBtn : speakBtn;
    const origHTML = forDownload ? downloadBtnHTML : speakBtnHTML;
    setBusy(btn, true, origHTML);
    setStatus(forDownload ? 'Generating audio…' : 'Speaking…', 'info', 0);

    try {
        const payload = { ...getPayload(text), download: forDownload };

        const res = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Server error ${res.status}`);
        }

        if (forDownload) {
            // Step 1: get one-time download URL from backend
            const meta = await res.json();
            if (!meta.download_url) throw new Error('No download URL returned');

            // Step 2: fetch the actual audio file as blob
            const audioRes = await fetch(meta.download_url);
            if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`);
            const audioBlob = await audioRes.blob();

            // Step 3: force save-to-disk via blob URL
            const blobUrl = URL.createObjectURL(audioBlob);
            const filename = meta.filename || 'vocalize.mp3';
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(blobUrl); }, 2000);
            setStatus(`✅ Saved as ${filename}`, 'ok');
        } else {
            // Speak: stream audio directly
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            // Apply volume (0–1 range)
            const vol = (parseInt(volumeSlider?.value) ?? 80) / 100;
            audio.volume = Math.max(0, Math.min(1, vol));
            // Apply playback speed (normalize: 150 = 1.0x)
            const rate = parseInt(speedSlider?.value) || 150;
            audio.playbackRate = Math.max(0.5, Math.min(2.0, rate / 150));
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
            setStatus('🔊 Playing audio…', 'ok');
        }

        loadHistory();
    } catch (e) {
        setStatus('❌ ' + e.message, 'err');
    } finally {
        setBusy(btn, false, origHTML);
    }
}

speakBtn.addEventListener('click', () => generate(false));

downloadBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) { setStatus('⚠️ Please enter some text first.', 'err'); return; }

    setBusy(downloadBtn, true, downloadBtnHTML);
    setStatus('Generating audio…', 'info', 0);

    try {
        // Fetch audio as blob via POST
        const res = await fetch('/download-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                text: text,
                language: languageSelect.value,
                gender: voiceSelect?.value || 'female'
            })
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const blob = await res.blob();
        const shortId = Math.random().toString(36).substr(2, 8);
        const filename = `vocalize-${shortId}.mp3`;

        if (window.showSaveFilePicker) {
            // ── File System Access API: shows native Windows Save As dialog ──
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'MP3 Audio', accept: { 'audio/mpeg': ['.mp3'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            // ── Fallback: blob URL click ──
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 3000);
        }

        setStatus(`✅ Saved as ${filename}`, 'ok');
        setTimeout(loadHistory, 2000);
    } catch (e) {
        if (e.name === 'AbortError') {
            setStatus('Download cancelled.', 'info');
        } else {
            setStatus('❌ ' + e.message, 'err');
        }
    } finally {
        setBusy(downloadBtn, false, downloadBtnHTML);
    }
});

// ── Clear ─────────────────────────────────────
clearBtn.addEventListener('click', () => {
    textInput.value = '';
    wordCountEl.textContent = '0';
    textInput.focus();
    setStatus('Text cleared.', 'info');
});

// ── Translate then speak ──────────────────────
const translateBtnHTML = translateBtn.innerHTML;

translateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
        setStatus('⚠️ Please enter some text first.', 'err');
        return;
    }

    const targetLang = languageSelect.value;

    setBusy(translateBtn, true, translateBtnHTML);
    setStatus('Translating…', 'info', 0);

    try {
        const res = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target: targetLang })
        });
        const data = await res.json();
        if (data.error && !data.translated) throw new Error(data.error);

        const translated = data.translated || text;
        textInput.value = translated;
        updateWordCount();
        setStatus('✅ Translated! Click Speak to hear it.', 'ok');
    } catch (e) {
        setStatus('❌ Translation failed: ' + e.message, 'err');
    } finally {
        setBusy(translateBtn, false, translateBtnHTML);
    }
});

// ── Upload file ───────────────────────────────
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
        setStatus('❌ File too large (max 1 MB).', 'err');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        textInput.value = ev.target.result;
        updateWordCount();
        setStatus(`✅ Loaded: ${file.name}`, 'ok');
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
});

// ── History ───────────────────────────────────
function renderHistory(items) {
    historyList.innerHTML = '';

    if (!items || items.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No history yet. Speak some text!</p>';
        return;
    }

    items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'history-item';

        const preview = item.preview || (item.text ? item.text.substring(0, 80) + (item.text.length > 80 ? '…' : '') : '');
        const words = item.word_count || (item.text ? item.text.split(/\s+/).filter(Boolean).length : 0);
        const lang = item.language || 'en';
        const mode = item.mode || 'offline';

        div.innerHTML = `
            <div class="history-item-body">
                <div class="history-item-text">${escapeHTML(preview)}</div>
                <div class="history-item-meta">
                    <span>${words} words</span>
                    <span class="meta-tag">${lang.toUpperCase()}</span>
                    <span class="meta-tag">${mode}</span>
                </div>
            </div>
            <button class="history-replay-btn" title="Replay this text" aria-label="Replay">
                <svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>
            </button>
        `;

        // Click body → restore text
        div.querySelector('.history-item-body').addEventListener('click', () => {
            textInput.value = item.text || '';
            updateWordCount();
            textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            textInput.focus();
        });

        // Replay button → restore + speak
        div.querySelector('.history-replay-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            textInput.value = item.text || '';
            updateWordCount();
            generate(false, item.text);
        });

        historyList.appendChild(div);
    });
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function loadHistory() {
    try {
        const res = await fetch('/history');
        const data = await res.json();
        renderHistory(data);
    } catch {
        renderHistory([]);
    }
}

clearHistoryBtn.addEventListener('click', async () => {
    try {
        await fetch('/clear_history', { method: 'POST' });
        renderHistory([]);
        setStatus('History cleared.', 'info');
    } catch (e) {
        setStatus('❌ Could not clear history.', 'err');
    }
});

// ── Init ──────────────────────────────────────
loadHistory();
