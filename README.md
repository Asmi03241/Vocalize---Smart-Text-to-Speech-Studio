# 🎙️ Vocalize — Neural Text-to-Speech Web App

Vocalize is a modern Flask-based Text-to-Speech (TTS) web application powered by Microsoft Edge Neural Voices.  
It supports multiple languages, translation, audio download, playback speed control, volume control, file upload, and persistent conversion history.

---

## 🚀 Features

- 🔊 Neural Text-to-Speech (9 Languages)
- 🎭 Male & Female Voice Selection
- ⚡ Speed Control (0.5x – 2x)
- 🔉 Volume Control
- 🌍 Built-in Google Translation
- 📥 Audio Download (.mp3)
- 📂 Text File Upload (.txt)
- 📜 Persistent Conversion History (Last 20)
- 🌙 Dark / Light Mode
- 🔄 Replay & Restore from History
- ⏳ Loading States & Status Bar
- 🚫 No-Cache API Headers

---

## 🛠️ Tech Stack

**Backend**
- Flask
- edge-tts (Microsoft Neural Voices)
- deep-translator
- pyttsx3 (fallback)
- asyncio
- uuid

**Frontend**
- HTML
- CSS (Dark/Light Theme)
- Vanilla JavaScript
- Web Audio API

---

## 📁 Project Structure
Vocalize/
│
├── app.py
├── speech_engine.py
├── history.json
├── requirements.txt
├── README.md
├── .gitignore
│
├── audio/
│
├── templates/
│ └── index.html
│
└── static/
├── script.js
└── style.css


---

## 🌍 Supported Languages

| Language | Male Voice | Female Voice |
|----------|------------|--------------|
| English | en-US-GuyNeural | en-US-JennyNeural |
| Hindi | hi-IN-MadhurNeural | hi-IN-SwaraNeural |
| Marathi | mr-IN-ManoharNeural | mr-IN-AarohiNeural |
| French | fr-FR-HenriNeural | fr-FR-DeniseNeural |
| Spanish | es-ES-AlvaroNeural | es-ES-ElviraNeural |
| German | de-DE-ConradNeural | de-DE-KatjaNeural |
| Japanese | ja-JP-KeitaNeural | ja-JP-NanamiNeural |
| Chinese | zh-CN-YunxiNeural | zh-CN-XiaoxiaoNeural |
| Arabic | ar-SA-HamedNeural | ar-SA-ZariyahNeural |

---

## ⚙️ Installation

### 1️⃣ Clone Repository
git clone https://github.com/YOUR_USERNAME/Vocalize.git
cd Vocalize


### 2️⃣ Create Virtual Environment
python -m venv venv
venv\Scripts\activate


### 3️⃣ Install Dependencies
pip install -r requirements.txt


### 4️⃣ Run Application
python app.py
Open http://127.0.0.1:5000 in your browser

---

## 📦 API Endpoints

| Route | Method | Purpose |
|--------|--------|----------|
| `/` | GET | Render UI |
| `/generate` | POST | Generate TTS |
| `/download-file` | POST | Download audio |
| `/get-audio/<id>` | GET | Retrieve cached audio |
| `/history` | GET | Fetch history |
| `/clear_history` | POST | Clear history |
| `/translate` | POST | Translate text |

---

## 🧠 How It Works

1. User enters text
2. Frontend sends request to Flask
3. Flask calls `edge-tts`
4. Audio is generated and streamed
5. Playback handled via Web Audio API
6. History stored in `history.json`

---

## 📌 Future Improvements

- Cloud deployment
- User accounts
- Cloud audio storage
- Usage analytics
- Mobile PWA version

---

## 👩‍💻 Author

Built with ❤️ using Flask & Microsoft Neural TTS
