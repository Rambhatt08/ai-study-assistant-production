import os
import json
import urllib.request
import urllib.error
import time
from dotenv import load_dotenv
from moviepy.editor import AudioFileClip

load_dotenv()
print("MEDIA_ENGINE_LOADED")

def send_chunk_to_whisper(chunk_path: str, api_key: str) -> str:
    """Helper function to send an isolated audio chunk under 25MB to Groq Whisper."""
    transcription_url = "https://api.groq.com/openai/v1/audio/transcriptions"
    boundary = "----WebKitFormBoundaryGroq2026"
    body = bytearray()
    
    # 1. Model field parameters
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="model"\r\n\r\n')
    body.extend(b'whisper-large-v3\r\n')
    
    # 2. Sanitized file body payload
    filename = os.path.basename(chunk_path)
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(b'Content-Type: audio/mp3\r\n\r\n')
    
    with open(chunk_path, 'rb') as f:
        body.extend(f.read())
    body.extend(b'\r\n')
    
    body.extend(f"--{boundary}--\r\n".encode('utf-8'))
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "Mozilla/5.0"
    }
    
    req = urllib.request.Request(transcription_url, data=bytes(body), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get("text", "").strip()
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ Chunk transcription rejected: {error_body}")
        raise Exception(f"Groq API Error: {error_body}")


def process_audio_video(file_path: str) -> str:
    """
    Processes any size media file. Small files are sent directly. 
    Large files are programmatically chunked down into safe <25MB MP3 pieces.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is missing from your environment variables!")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No media file found at path: {file_path}")

    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"File size analyzed: {file_size_mb:.2f} MB")

    full_transcript = ""

    # =====================================================================
    # CASE A: FILE IS LARGE -> ENGAGE THE AUTOMATED CHUNKING ENGINE
    # =====================================================================
    if file_size_mb > 24.0:
        print("⚠️ File exceeds Groq's 25MB ceiling. Deploying slicing matrix...")
        audio_clip = None
        created_chunks = []
        
        try:
            audio_clip = AudioFileClip(file_path)
            total_duration = audio_clip.duration  # Length in seconds
            print(f"Media duration extracted: {total_duration:.2f} seconds")
            
            # Slice audio into 10-minute intervals (600 seconds per chunk)
            chunk_duration = 600 
            start_time = 0
            chunk_index = 0
            
            while start_time < total_duration:
                end_time = min(start_time + chunk_duration, total_duration)
                print(f"Slicing chunk {chunk_index}: {start_time}s to {end_time}s")
                
                sub_segment = audio_clip.subclip(start_time, end_time)
                chunk_filename = f"temp_chunk_{chunk_index}_{os.path.basename(file_path)}.mp3"
                
                # Compress chunk down to 64k joint-stereo mp3 (makes 10 minutes look like only ~4MB!)
                sub_segment.write_audiofile(
                    chunk_filename, 
                    fps=16000, 
                    bitrate="64k", 
                    logger=None
                )
                created_chunks.append(chunk_filename)
                
                # Send the clean chunk off to Whisper immediately
                print(f"Streaming segment {chunk_index} to Whisper...")
                chunk_text = send_chunk_to_whisper(chunk_filename, api_key)
                if chunk_text:
                    full_transcript += chunk_text + " "
                
                start_time += chunk_duration
                chunk_index += 1
                
            print("✅ All media fragments successfully compiled.")
            
        except Exception as media_err:
            print(f"❌ Internal Media Splitter Failure: {media_err}")
            raise Exception(f"Media extraction pipeline failed: {str(media_err)}")
            
        finally:
            if audio_clip:
                audio_clip.close()
            for chunk_file in created_chunks:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
                    print(f"Cleaned chunk workspace file: {chunk_file}")

    # =====================================================================
    # CASE B: FILE IS SMALL -> SEND DIRECTLY TO SAVE LATENCY
    # =====================================================================
    else:
        print("File falls within standard payload safety parameters. Routing directly...")
        _, ext = os.path.splitext(file_path)
        safe_name = f"direct_payload{ext.lower()}"
        
        boundary = "----WebKitFormBoundaryGroq2026"
        body = bytearray()
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(b'Content-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n')
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="file"; filename="{safe_name}"\r\n'.encode('utf-8'))
        body.extend(b'Content-Type: application/octet-stream\r\n\r\n')
        
        with open(file_path, 'rb') as f:
            body.extend(f.read())
        body.extend(b'\r\n--' + boundary.encode('utf-8') + b'--\r\n')
        
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/audio/transcriptions", 
            data=bytes(body), 
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": f"multipart/form-data; boundary={boundary}", "User-Agent": "Mozilla/5.0"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                result = json.loads(response.read().decode('utf-8'))
                full_transcript = result.get("text", "").strip()
        except Exception as direct_err:
            raise Exception(f"Direct transmission failed: {str(direct_err)}")

    if not full_transcript.strip():
        raise ValueError("No linguistic audio components could be extracted from this media asset.")

    # =====================================================================
    # GATEWAY GUARDRAIL: Prevent HTTP 413 Payload Too Large Errors
    # =====================================================================
    print(f"Compiled Master Transcript Length: {len(full_transcript)} characters.")
    if len(full_transcript) > 120000:
        print(f"⚠️ Transcript exceeds safe gateway thresholds. Truncating text to prevent 413 exceptions...")
        full_transcript = full_transcript[:120000] + "... [Text truncated due to maximum payload limit restrictions]"

    # =====================================================================
    # STEP 3: MASTER SUMMARIZATION VIA GROQ LLAMA 3.1
    # =====================================================================
    print("Forwarding global aggregated text stream to Llama 3.1...")
    system_prompt = (
        "You are an expert, adaptable AI Study Buddy. Review the provided transcript of a lecture recording.\n"
        "Summarize the core concepts into highly structured, easy-to-read notes.\n\n"
        "CRITICAL RULES:\n"
        "1. ADAPT YOUR TONE: Match the maturity level and technical depth of the content.\n"
        "2. Use professional but highly accessible human language.\n"
        "3. Format using Markdown, descriptive headings (##), and bullet points.\n"
        "4. Highlight key terms in **bold**."
    )
    
    completion_payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the transcript of the media:\n{full_transcript}"}
        ]
    }
    
    req_summarize = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions", 
        data=json.dumps(completion_payload).encode('utf-8'), 
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}", "User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req_summarize, timeout=45) as response:
            summary_result = json.loads(response.read().decode('utf-8'))
            print("🎉 Note generation process completed successfully!")
            return summary_result['choices'][0]['message']['content']
    except Exception as e:
        raise Exception(f"Failed to summarize aggregated media transcript: {str(e)}")