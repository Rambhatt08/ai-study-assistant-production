import os
import json
import urllib.request
import urllib.error
import time
from dotenv import load_dotenv
from pypdf import PdfReader

# Load environment variables from the .env file
load_dotenv()

print("PDF_ENGINE_LOADED")

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Reads a local PDF file and extracts all raw text content page by page.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"No PDF file found at path: {pdf_path}")
        
    try:
        reader = PdfReader(pdf_path)
        extracted_text = ""
        
        # Iterate through all pages in the PDF file
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                extracted_text += f"\n--- Page {page_num + 1} ---\n{text}"
                
        if not extracted_text.strip():
            raise ValueError("The PDF appears to be empty or contains only unscannable images.")
            
        return extracted_text
    except Exception as e:
        raise Exception(f"Failed to process and read the PDF file: {str(e)}")

def simplify_pdf_content(raw_text: str) -> str:
    """
    Sends complex PDF text to Groq (Llama 3) to simplify it into clear, easy revision notes.
    """
    system_prompt = (
        "You are an expert, adaptable AI Study Buddy. Your goal is to summarize the following document into highly structured, easy-to-read notes.\n\n"
        "CRITICAL RULES:\n"
        "1. ADAPT YOUR TONE: Analyze the source material first. If it is for children, use a fun, simple, and encouraging tone. If it is high-level, use a professional but highly accessible tone.\n"
        "2. USE HUMAN LANGUAGE: Speak like a normal, helpful human being. Avoid overly dense academic jargon.\n"
        "3. If you must use a complex technical term, you MUST define it immediately in plain English.\n"
        "4. Format the output beautifully using Markdown with descriptive headings (##) and bullet points.\n"
        "5. Highlight key terms in **bold**."
    )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY is missing from your environment variables!")

    # GROQ REST API Endpoint
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the CONTENT TO SUMMARIZE:\n{raw_text}"}
        ]
    }
    
    # EXACT Chrome Browser Signature to bypass Cloudflare Error 1010
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
            print("USING GROQ REST API (Llama 3) for PDF...")
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                ai_notes = result['choices'][0]['message']['content']
                print("✅ GROQ API SUCCESS")
                return ai_notes
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"❌ GROQ ERROR: {e.code} - {error_body}")
            if e.code in [503, 429] and attempt < max_retries - 1:
                time.sleep(3)
            else:
                raise Exception(f"Groq API Error: {e.code}")
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(3)
            else:
                raise Exception(f"Groq Request Failed: {str(e)}")

# This executes only when running this file directly in the terminal
if __name__ == "__main__":
    print("\n=== VS CODE TERMINAL TESTING: PDF AI ENGINE (GROQ PIVOT) ===")
    
    # Make sure you have a dummy 'sample.pdf' in your backend folder to test this!
    test_pdf_path = "sample.pdf" 
    
    try:
        print(f"1. Reading local file '{test_pdf_path}'...")
        pdf_text = extract_text_from_pdf(test_pdf_path)
        print(f"   [SUCCESS] Extracted {len(pdf_text)} characters of text from the document.")
        
        print("\n2. Streaming text to Groq AI for language simplification...")
        simplified_notes = simplify_pdf_content(pdf_text)
        
        print("\n================ SIMPLIFIED STUDY NOTES ================")
        print(simplified_notes[:500] + "...\n\n[Notes truncated for display]")
        print("========================================================")
        print("\n🎉 PDF ENGINE IS 100% WORKING WITH GROQ!")
        
    except Exception as e:
        print(f"\n❌ Error in execution process: {e}")