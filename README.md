# 🧠 AI Powered Study Buddy

![Live Status](https://img.shields.io/badge/Status-Live_Production-success)
![Frontend](https://img.shields.io/badge/Frontend-React_%7C_Vite-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI_%7C_Python-green)
![AI Engine](https://img.shields.io/badge/AI_Model-Groq_Llama_3.1-orange)
![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-darkgreen)

A cloud-native, multi-modal educational platform that Uses Large Language Models (LLMs) to automatically convert raw study materials (videos, audio, and documents) into structured notes, interactive flashcards, and quizzes.

## 🚀 Live Demo
* **Frontend Application:** https://ai-study-assistant-production-f2nvuqhkw.vercel.app
* **Backend:** https://ai-study-assistant-production.onrender.com

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

