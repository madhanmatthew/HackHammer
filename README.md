# 🎓 LearnOS - AI-Powered 5-Minute Lessons

**LearnOS** is a web app that turns any topic into a quick, structured **5-minute lesson plan**. It uses Google Gemini AI to generate **key concepts, simple analogies, and interactive quizzes** — making learning fast, fun, and effective.

---

## ✨ Features

* 🚀 Instant lesson generation on any topic
* 📘 Key concepts explained simply
* 🔑 Easy analogies for better understanding
* 📝 Interactive quizzes with feedback
* 💻 Works on desktop & mobile
* 🔒 Secure API key handling

---

## ⚡ Quick Start

### Prerequisites

* Node.js (v14+) & npm/yarn
* Google Gemini API key

### Installation

```bash
# Clone repo
git clone https://github.com/madhanmatthew/HackHammer.git
cd HackHammer

# Install dependencies
npm install

# Copy env file & add API key
cp .env.example .env

# Start server
npm run dev
```

Visit 👉 `http://localhost:3000`

---

## 📁 Project Structure

```
learnos/
├── server.js         # Backend (Express.js)
├── public/index.html # Frontend
├── .env.example      # Env template
└── README.md
```

---

## 🔧 Environment Variables

`.env` file:

```
GOOGLE_API_KEY=your_api_key_here
PORT=3000
```

---

## 📊 API Endpoints

* `POST /api/generate` → Generate lesson plan
* `GET /api/health` → Server health check

---

## 🚀 Deployment

* Local: `npm run dev`
* Production: Use **PM2**, Docker, or deploy to Heroku/Vercel/Railway.

---

## 📌 Future Enhancements

* User accounts & lesson history
* Difficulty levels (Beginner → Advanced)
* Multi-language support
* Export lessons (PDF/Markdown)



