# 🧠 AI Powered Study Buddy

![Live Status](https://img.shields.io/badge/Status-Live_Production-success)
![Frontend](https://img.shields.io/badge/Frontend-React_%7C_Vite-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI_%7C_Python-green)
![AI Engine](https://img.shields.io/badge/AI_Model-Groq_Llama_3.1-orange)
![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-darkgreen)

A cloud-native, multi-modal educational platform that Uses Large Language Models (LLMs) to automatically convert raw study materials (videos, audio, and documents) into structured notes, interactive flashcards, and quizzes.

## 🚀 Live Demo
* **Frontend Application:** https://ai-study-assistant-production-f2nvuqhkw.vercel.app
* **Backend API:** https://ai-study-assistant-production.onrender.com

---

## ✨ Core Features

### 🔐 Secure Authentication & User Isolation
* **JWT-Based Login:** Secure, tokenized session management.
* **Email Verification:** OTP (One-Time Password) generation via SMTP for account creation.
* **Password Recovery:** Time-sensitive, cryptographic password reset links.
* **Multi-Tenant Architecture:** strict MongoDB queries ensure users can only access their own private study data.

### 📥 Multi-Modal Ingestion Engine
* **YouTube Processing:** Extracts hidden transcripts from URLs natively using `youtube-transcript-api`.
* **PDF Document Parsing:** Scans and extracts raw text from complex documents using `PyPDF`.
* **Direct Media Uploads:** Processes raw MP4/MP3 files using `MoviePy` (with strict 25MB guardrails to protect server memory).

### 🤖 AI Study Generation (Powered by Groq)
* **Ultra-Fast Summarization:** Uses `Llama-3.1-8b-instant` to format raw text into clean, readable bullet points in seconds.
* **Word Document Export:** Users can instantly download their generated study summaries as beautifully formatted Microsoft Word (`.docx`) files for offline reading and sharing.
* **Flashcard Engine:** Automatically generates 5-10 study flashcards formatted as strict JSON arrays for dynamic UI rendering.
* **Quiz Engine:** Generates multiple-choice quizzes based on the ingested context.
* **Context-Aware AI Tutor:** A dedicated chat interface that answers questions strictly based on the uploaded document context.

### 📊 Analytics Dashboard
* Tracks consecutive daily "Study Streaks".
* Aggregates total notes generated.
* Analyzes and displays the user's most frequently studied topics.

---

## 🛠️ Technology Stack

**Frontend:**
* React.js
* Vite
* Hosted on **Vercel**

**Backend:**
* Python 3
* FastAPI
* Uvicorn
* Hosted on **Render**

**Third-Party Services:**
* **Brevo (formerly Sendinblue):** SMTP API integration for secure, reliable email dispatching.

**AI & Data:**
* **Groq REST API** (Bypassing heavy SDKs for lower latency)
* **MongoDB Atlas** (Cloud Database with strict TLS certification)

**Resilience & Stability:**
* Implemented **Exponential Backoff** algorithms to gracefully handle 429 Rate Limits from the cloud LLM provider without crashing the user experience.
* Hardened CORS (Cross-Origin Resource Sharing) policies.

---

## 💻 Local Development Setup

If you want to run this project locally on your machine, follow these steps:

### 1. Clone the Repository
```bash
git clone [https://github.com/Rambhatt08/ai-study-assistant-production.git](https://github.com/Rambhatt08/ai-study-assistant-production.git)
cd ai-study-assistant-production

2. Backend Setup
Navigate to the backend folder and install the required Python packages:

cd backend
pip install -r requirements.txt

Create a .env file in the backend directory and add your secret keys:
**Note:** To run this project locally, you must generate a free API key from the [Groq Console](https://console.groq.com/keys) and add it to your `.env` file, otherwise the AI generation features will not work.

MONGO_URI=your_mongodb_atlas_connection_string
GROQ_API_KEY=your_groq_api_key

# Security & Authentication
SECRET_KEY=generate_a_long_random_string_here

# Email Verification (SMTP Setup)
EMAIL_SENDER=your_gmail_address@gmail.com
EMAIL_APP_PASSWORD=your_16_digit_google_app_password

Start the FastAPI server:

uvicorn main:app --reload

The backend will run on http://localhost:8000

3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install the Node dependencies:

cd frontend
npm install

Start the Vite development server:
npm run dev

The frontend will run on http://localhost:5173


---

## 🔄 Alternative AI Engine: Google Gemini

By default, this project is configured to use the **Groq Llama 3.1** engine for ultra-low latency inference. However, the architecture is modular, and you can easily swap it to use Google's Gemini models via Google AI Studio.

If you prefer to use Gemini:

**1. Get an API Key:**
Generate a free API key from [Google AI Studio](https://aistudio.google.com/).

**2. Update your `.env` file:**
Add your new key to your environment variables:
```env
GEMINI_API_KEY=your_google_gemini_key_here

3. Install the SDK:
You will need to install the Google Generative AI package:
pip install google-genai

4. Swap the Logic:
Inside backend/main.py, replace the call_groq_api function with the Gemini SDK integration to route the prompts through Google's infrastructure instead.
