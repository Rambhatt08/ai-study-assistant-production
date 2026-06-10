import os
import shutil
import urllib.request
import urllib.error
import json
import secrets
import time 
import certifi
from datetime import datetime, timedelta
from typing import List

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

# Import core systems
from youtube_engine import extract_video_id, get_youtube_transcript, generate_notes_from_transcript
from pdf_engine import extract_text_from_pdf, simplify_pdf_content
from database import save_note_to_db, get_all_notes_history
from media_engine import process_audio_video
from auth import (
    hash_password, verify_password, create_access_token, 
    generate_otp, send_otp_email, send_welcome_email, 
    send_password_reset_email, send_password_success_email
)

MONGO_URI = os.getenv("MONGO_URI")

# --- THE BULLETPROOF DATABASE CONNECTION ---
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client["ai_study_assistant_db"]
    users_collection = db["users"]
    notes_collection = db["notes"]
    
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB!")
except Exception as e:
    print(f"❌ MongoDB Connection Error: {e}")

app = FastAPI(title="AI Study Assistant Hub API")

origins = [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://localhost:8000",
    "https://ai-study-assistant-production-7qak9w695.vercel.app"  # Your active deployment URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Points back to your explicit whitelist array
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ========================================================
# === GROQ Llama-3 REST API HELPER (Bypasses Google) =====
# ========================================================
# ========================================================================
# === GROQ Llama-3 REST API HELPER WITH EXPONENTIAL BACKOFF RECOVERY ===
# ========================================================================
def call_groq_api(prompt: str, system_prompt: str = "") -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY is missing from environment variables")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": "llama-3.1-8b-instant", 
        "messages": messages
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    
    # SENIOR IMPLEMENTATION: Smart backoff loop to clear cloud rate limit limits gracefully
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                return result['choices'][0]['message']['content']
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            
            if e.code == 429:
                wait_time = (attempt + 1) * 3  # Cascades upward: 3s, then 6s, then 9s
                print(f"⚠️ Rate limit hit (429). Retrying in {wait_time}s... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue  # Loop back up and try the handshake again
                
            elif e.code == 503 and attempt < max_retries - 1:
                print(f"⚠️ Groq Service Unavailable (503). Retrying in 3s...")
                time.sleep(3)
                continue
            else:
                print(f"❌ GROQ CRITICAL ERROR: {e.code} - {error_body}")
                raise Exception(f"Groq API Error: {e.code}")
                
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Network connection anomaly detected. Re-establishing link in 3s...")
                time.sleep(3)
                continue
            else:
                raise e
                
    raise Exception("Max query retries exceeded. Cloud service limits are currently saturated.")

# --- DATA MODELS ---
class YouTubeRequest(BaseModel):
    url: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class VerifyOTP(BaseModel):
    email: str
    otp: str
    
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    context: str
    message: str
    history: List[ChatMessage] = []
    
class FlashcardRequest(BaseModel):
    content: str

# --- AUTHENTICATION ROUTES ---
@app.post("/api/auth/register")
def register_user(user: UserCreate):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user and existing_user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    otp = generate_otp()
    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": "student", 
        "is_verified": False,
        "otp": otp,
        "created_at": datetime.utcnow()
    }
    
    if existing_user:
        users_collection.update_one({"email": user.email}, {"$set": user_data})
    else:
        users_collection.insert_one(user_data)
        
    send_otp_email(user.email, otp)
    return {"success": True, "message": "OTP sent to email"}

@app.post("/api/auth/verify")
def verify_user(data: VerifyOTP):
    user = users_collection.find_one({"email": data.email})
    if not user or user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    
    users_collection.update_one({"email": data.email}, {"$set": {"is_verified": True, "otp": None}})
    send_welcome_email(data.email, user["name"])
    
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {"success": True, "token": token, "name": user["name"], "email": user["email"]}

@app.post("/api/auth/login")
def login_user(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials.")
    if not db_user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Please verify email first.")
        
    token = create_access_token({"sub": db_user["email"], "role": db_user["role"]})
    return {"success": True, "token": token, "name": db_user["name"], "email": db_user["email"]}

@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    clean_email = request.email.strip().lower()
    user = users_collection.find_one({"email": clean_email})
    if not user:
        return {"success": True, "message": "If the account exists, a reset link has been dispatched."}
    
    reset_token = secrets.token_urlsafe(32)
    expiry_time = datetime.utcnow() + timedelta(minutes=15)
    
    users_collection.update_one(
        {"email": clean_email},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry_time}}
    )
    
    reset_link = f"http://localhost:5173?mode=reset-password&token={reset_token}"
    email_was_sent = send_password_reset_email(clean_email, reset_link)
    
    if not email_was_sent:
        raise HTTPException(status_code=500, detail="SMTP server failed.")
        
    return {"success": True, "message": "If the account exists, a reset link has been dispatched."}

@app.post("/api/auth/reset-password")
def reset_password(request: ResetPasswordRequest):
    user = users_collection.find_one({
        "reset_token": request.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()} 
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery link.")
        
    updated_hash = hash_password(request.new_password)
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": updated_hash}, "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )
    send_password_success_email(user["email"])
    return {"success": True, "message": "Password changed successfully."}


# --- ENGINE & HISTORY ROUTES ---
@app.get("/")  
def read_root():
    return {"message": "Server active!"}

@app.post("/api/chat")
def document_chat(request: ChatRequest):
    try:
        history_prompt = ""
        for msg in request.history:
            role = "Student" if msg.role == "user" else "Tutor"
            history_prompt += f"{role}: {msg.text}\n"
        
        system_prompt = (
            "You are an expert, adaptable AI Study Tutor. Answer the student's question based on the document context provided.\n\n"
            "CRITICAL RULES:\n"
            "1. ADAPT YOUR TONE: Match the maturity level.\n"
            "2. Speak in normal, conversational human language.\n"
            "3. Use Markdown, bold text, and bullet points.\n"
            "4. Do not include introductory filler.\n\n"
            f"--- DOCUMENT CONTEXT ---\n{request.context}\n\n"
            f"--- CONVERSATION HISTORY ---\n{history_prompt}"
        )
        
        prompt = f"Student: {request.message}\nTutor:"
        
        reply = call_groq_api(prompt=prompt, system_prompt=system_prompt)
        return {"success": True, "reply": reply}
                    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notes/youtube")
def process_youtube_notes(data: YouTubeRequest, email: str): 
    print("YOUTUBE ROUTE HIT")
    print("URL RECEIVED:", data.url)
    try:
        video_id = extract_video_id(data.url)
        transcript = get_youtube_transcript(video_id)
        
        # Bypassed SDK completely. Natively uses Groq now.
        ai_notes = generate_notes_from_transcript(transcript)
        
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            with urllib.request.urlopen(oembed_url) as response:
                video_data = json.loads(response.read().decode())
                real_title = video_data.get("title", "YouTube Video")
        except Exception:
            real_title = "YouTube Video"
        
        note_id = save_note_to_db("youtube", data.url, real_title, ai_notes, email)
        return {"success": True, "note_id": note_id, "title": real_title, "content": ai_notes}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/notes/pdf")
async def process_pdf_notes(email: str, file: UploadFile = File(...)): 
    # Added secrets hash to prevent file collisions during heavy usage
    temp_file_path = f"temp_{secrets.token_hex(4)}_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        pdf_text = extract_text_from_pdf(temp_file_path)
        simplified_notes = simplify_pdf_content(pdf_text)
        
        note_id = save_note_to_db("pdf", file.filename, file.filename, simplified_notes, email)
        return {"success": True, "note_id": note_id, "title": file.filename, "content": simplified_notes}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/api/notes/media")
async def process_media_notes(email: str, file: UploadFile = File(...)): 
    # Added secrets hash to prevent file collisions during heavy usage
    temp_file_path = f"temp_{secrets.token_hex(4)}_{file.filename}"    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        notes = process_audio_video(temp_file_path)
        
        note_id = save_note_to_db("media", file.filename, file.filename, notes, email)
        
        return {"success": True, "note_id": note_id, "title": file.filename, "content": notes}
    except Exception as e:
        print(f"Media Route Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

from quiz_engine import generate_quiz
class QuizRequest(BaseModel):
    content: str

@app.post("/api/quiz/generate")
def create_quiz(request: QuizRequest):
    try:
        quiz_data = generate_quiz(request.content, num_questions=5)
        return {"success": True, "quiz": quiz_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notes/history")
def fetch_history(email: str): 
    try:
        history = get_all_notes_history(user_email=email)
        return {"success": True, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/flashcards/generate")
def generate_flashcards(request: FlashcardRequest):
    try:
        system_prompt = (
            "You are an expert tutor. Break the following document down into 5 to 10 highly effective study flashcards.\n"
            "Return ONLY a valid JSON array of objects. Do not include markdown formatting like ```json or any other text.\n\n"
            "Format exactly like this:\n"
            "[\n"
            '    {"term": "Deep Learning", "definition": "A subset of ML using artificial neural networks."},\n'
            '    {"term": "Photosynthesis", "definition": "Process by which plants convert light energy into chemical energy."}\n'
            "]"
        )
        
        prompt = f"--- DOCUMENT CONTEXT ---\n{request.content}"
        response_text = call_groq_api(prompt=prompt, system_prompt=system_prompt)
        
        # BOUNDARY FIX: Locate the absolute starting and closing array braces
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            print("Raw conversion text failed to output structure:", response_text)
            raise ValueError("The AI model failed to produce a cleanly parseable JSON array.")
            
        clean_json = response_text[start_idx:end_idx].strip()
        flashcards_data = json.loads(clean_json)
        return {"success": True, "flashcards": flashcards_data}
        
    except Exception as e:
        print(f"Flashcard Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

# --- ANALYTICS DASHBOARD ROUTE (Simplified) ---
from collections import Counter

@app.get("/api/analytics")
def get_analytics(email: str):
    try:
        history = get_all_notes_history(user_email=email)
        if not history:
            return {"success": True, "streak": 0, "total": 0, "topics": []}
        
        parsed_notes = []
        for n in history:
            try:
                created_at = n.get("created_at")
                if isinstance(created_at, str):
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                elif isinstance(created_at, datetime):
                    dt = created_at 
                else:
                    dt = datetime.utcnow()
            except Exception as e:
                dt = datetime.utcnow()
                
            parsed_notes.append({"title": n.get("title", ""), "date": dt.date()})
            
        today = datetime.utcnow().date()
        unique_dates = sorted(list(set([n["date"] for n in parsed_notes])), reverse=True)
        
        streak = 0
        check_date = today
        
        if unique_dates and unique_dates[0] in [today, today - timedelta(days=1)]:
            for d in unique_dates:
                if d == check_date:
                    streak += 1
                    check_date -= timedelta(days=1)
                elif d == check_date - timedelta(days=1) and streak == 0:
                    streak += 1
                    check_date = d - timedelta(days=1)
                else:
                    break
        
        words = []
        stopwords = {"the","and","for","with","notes","simplified","youtube","video","what","how", "from", "part"}
        for n in parsed_notes:
            clean_title = "".join([c for c in n["title"] if c.isalnum() or c.isspace()])
            words.extend([w.lower() for w in clean_title.split() if len(w) > 3 and w.lower() not in stopwords])
        
        topics = [{"text": k.capitalize(), "weight": v} for k, v in Counter(words).most_common(12)]
        
        return {
            "success": True,
            "streak": streak,
            "total": len(parsed_notes),
            "topics": topics
        }
    except Exception as e:
        print(f"Analytics Error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 
    
# --- TESTING ROUTES UPDATED FOR GROQ ---
@app.get("/api/debug-env")
def debug_env():
    return {
        "groq_key_exists": bool(os.getenv("GROQ_API_KEY")),
        "mongo_uri_exists": bool(os.getenv("MONGO_URI"))
    }
    
@app.get("/api/test-groq")
def test_groq():
    try:
        response = call_groq_api(prompt="Reply with exactly: Hello", system_prompt="")
        return {
            "success": True,
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
        
@app.get("/api/test-youtube-groq")
def test_youtube_groq():
    try:
        result = generate_notes_from_transcript("This is a simple test transcript about cloud computing.")
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }