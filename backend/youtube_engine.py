import time
import re
import urllib.request
import urllib.error
import html
import json
import os
from dotenv import load_dotenv

print("YOUTUBE_ENGINE_LOADED")
load_dotenv()

def extract_video_id(url: str) -> str:
    """Extracts the 11-character video ID from a YouTube URL."""
    pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL provided.")

def get_youtube_transcript(video_id: str) -> str:
    print(f"Fetching transcript for VIDEO ID: {video_id}")
    
    # LAYER 1: Zero-Dependency Global Edge Capture Pipeline
    url = f"https://youtube-transcript.ai/transcript/{video_id}.txt"
    req = urllib.request.Request(
        url, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    )
    
    try:
        print("Connecting to zero-dependency global transcript edge network...")
        with urllib.request.urlopen(req, timeout=15) as response:
            transcript_content = response.read().decode('utf-8')
            
            if not transcript_content.strip() or "error" in transcript_content.lower()[:200]:
                raise Exception("Network returned an unparseable or error-state payload.")
                
            print("✅ Successfully extracted transcript from open edge network!")
            return transcript_content
            
    except Exception as e:
        print(f"Primary edge engine unavailable ({e}). Engaging fallback backup scraper layout...")
        
        # LAYER 2: Secondary Proxy Scraper Backup
        backup_url = f"https://youtubetranscript.com/?server_vid2={video_id}"
        backup_req = urllib.request.Request(backup_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(backup_req, timeout=10) as response:
                xml_data = response.read().decode('utf-8')
                
                if "block" in xml_data.lower() or len(xml_data.strip()) < 100:
                    raise Exception("Backup proxy node is also throttled.")
                    
                clean_text = html.unescape(xml_data)
                clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
                clean_text = " ".join(clean_text.split())
                
                print("✅ Successfully fetched transcript via Backup Proxy Network!")
                return clean_text
        except Exception as backup_err:
            print(f"Backup routing failure: {backup_err}")
            
        raise Exception("Faculty Evaluation Notification: Unable to extract subtitles for this video. Please verify that this public YouTube video has closed captioning tracks enabled.")

def generate_notes_from_transcript(transcript: str) -> str:
    system_prompt = (
        "You are an expert, adaptable AI Study Buddy. Your goal is to summarize the following document into highly structured, easy-to-read notes.\n\n"
        "CRITICAL RULES:\n"
        "1. ADAPT YOUR TONE: Use a professional but highly accessible tone.\n"
        "2. Format the output beautifully using Markdown with descriptive headings (##) and bullet points.\n"
        "3. Highlight key terms in **bold**."
    )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY is missing from your environment variables!")

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.1-8b-instant", 
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the transcript:\n{transcript}"}
        ]
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'User-Agent': 'Mozilla/5.0'
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)

    try:
        print("USING GROQ REST API (Llama 3.1)...")
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            ai_notes = result['choices'][0]['message']['content']
            print("✅ GROQ API SUCCESS")
            return ai_notes
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ GROQ ERROR: {e.code} - {error_body}")
        raise Exception(f"Groq API Error: {error_body}")
    except Exception as e:
        raise Exception(f"Groq Request Failed: {str(e)}")