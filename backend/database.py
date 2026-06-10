import certifi
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime


# Load configuration values from .env
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

try:
    client = MongoClient(
    MONGO_URI, 
    tls=True, 
    tlsCAFile=certifi.where(), # Use certifi to find valid SSL certificates
    tlsAllowInvalidCertificates=True # This forces it to skip the handshake check
    )
    
   
    
    db = client["ai_study_assistant_db"]
    notes_collection = db["generated_notes"]
    users_collection = db["users"] 
    
    print("Successfully connected and linked pipeline to cloud MongoDB instance.")
    
except Exception as e:
    print(f"FATAL: Database connection failed: {e}")
    db = None
    notes_collection = None
    users_collection = None

# === UPDATED: Now requires user_email to save ===
def save_note_to_db(source_type: str, source_identifier: str, title: str, content: str, user_email: str) -> str:
    """Saves a generated note summary document into MongoDB under a specific user's email."""
    if notes_collection is None:
        raise Exception("Database not connected.")
        
    note_document = {
        "user_email": user_email,               # The Owner Tag!
        "source_type": source_type,
        "source_identifier": source_identifier,
        "title": title,
        "content": content,
        "created_at": datetime.utcnow()
    }
    
    result = notes_collection.insert_one(note_document)
    return str(result.inserted_id)

# === UPDATED: Filters history by user_email ===
def get_all_notes_history(user_email: str):
    """Retrieves saved summaries belonging ONLY to the specified user email."""
    if notes_collection is None:
        return []
        
    # We pass the filter query {"user_email": user_email} here
    notes = list(notes_collection.find({"user_email": user_email}).sort("created_at", -1))
    for note in notes:
        note["_id"] = str(note["_id"])
    return notes