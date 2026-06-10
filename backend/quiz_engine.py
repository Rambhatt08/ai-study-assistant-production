import os
import json
import urllib.request
import urllib.error
import time
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

print("QUIZ_ENGINE_LOADED")

def generate_quiz(notes_content: str, num_questions: int = 5):
    """
    Takes study notes and generates a strict JSON array of multiple-choice questions using Groq Llama 3.
    """
    system_prompt = f"""
    You are an expert educational assessor. Based ONLY on the following study notes, 
    generate a {num_questions}-question multiple-choice quiz. 
    
    CRITICAL: You MUST return ONLY a valid JSON array. Do not include markdown formatting like ```json or ```.
    Do not include any conversational introductions, summaries, or explanations outside the JSON array.
    
    Format EXACTLY like this:
    [
      {{
        "question": "What is the main concept?",
        "options": [
          "Option 1 text",
          "Option 2 text",
          "Option 3 text",
          "Option 4 text"
        ],
        "correct_answer": "Option 2 text",
        "explanation": "Explain why this answer is correct."
      }}
    ]
        
    Here are the notes to base the quiz on:
    {notes_content}
    """
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is missing from your environment variables!")

    url = "https://api.groq.com/openai/v1/chat/completions"
    
    payload = {
       "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": system_prompt}
        ],
        "temperature": 0.2  # Set low to guarantee rigid layout adherence
    }
    
    # Exact Chrome signatures to confidently bypass Cloudflare blocks
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Generating structured quiz via Groq API (Attempt {attempt + 1})...")
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                raw_text = result['choices'][0]['message']['content'].strip()
                
                # Resilient cleaning logic if the model slips up and adds backticks
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                    
                quiz_data = json.loads(raw_text.strip())
                print("✅ QUIZ GENERATION SUCCESSFUL")
                return quiz_data
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"❌ GROQ QUIZ ENGINE ERROR: {e.code} - {error_body}")
            if e.code in [429, 503] and attempt < max_retries - 1:
                time.sleep(3)
            else:
                raise ValueError(f"Groq API Error: {e.code}")
        except Exception as e:
            print(f"⚠️ Parsing attempt failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(3)
            else:
                raise ValueError("Failed to generate a valid quiz structure from Groq.")