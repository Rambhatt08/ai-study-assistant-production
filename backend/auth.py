import os
import random
import jwt
import json
import urllib.request
from datetime import datetime, timedelta
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

# Security Configurations
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# Email Configurations (Now using Brevo API)
SENDER_EMAIL = os.getenv("EMAIL_SENDER")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_otp():
    """Generates a secure 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_email(to_email: str, subject: str, html_content: str):
    """Core function to send HTML emails via Brevo HTTPS API (Bypasses Render Firewall)"""
    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        # We use Python's built-in urllib to avoid needing new pip installs
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            if response.getcode() in [200, 201, 202]:
                return True
            return False
    except Exception as e:
        print(f"Brevo API Error: {e}")
        return False

def send_otp_email(to_email: str, otp: str):
    subject = "Your AI Study Assistant Verification Code"
    html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">Verify Your Account</h2>
        <p>Your one-time password (OTP) to activate your student account is:</p>
        <h1 style="letter-spacing: 5px; color: #1e293b;">{otp}</h1>
        <p>This code will expire shortly. Do not share it with anyone.</p>
    </div>
    """
    return send_email(to_email, subject, html)

def send_welcome_email(to_email: str, name: str):
    subject = "Welcome to the AI Study Assistant! 🚀"
    html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">Welcome aboard, {name}!</h2>
        <p>Your account is officially verified and active.</p>
        <p>You can now start generating structured study guides, taking AI quizzes, and consuming technical lessons efficiently.</p>
        <p>Happy Learning!</p>
    </div>
    """
    return send_email(to_email, subject, html)

def send_password_reset_email(to_email: str, reset_link: str):
    subject = "🔐 Secure Password Recovery Link"
    html = f"""
    <h2>Password Reset Requested</h2>
    <p>We received a request to reset your password. Click the secure link below to proceed:</p>
    <p><a href="{reset_link}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Reset Password</a></p>
    <p>This link will remain active for exactly 15 minutes. If you did not request this, please ignore this email.</p>
    """
    return send_email(to_email, subject, html)

def send_password_success_email(to_email: str):
    subject = "✅ Password Changed Successfully"
    html = """
    <h2>Password Updated Successfully</h2>
    <p>Your AI Study Assistant account password has just been changed.</p>
    <p>If you made this change, no further action is required. You can now log in with your new password.</p>
    <p style="color:red;">If you did not make this change, please contact support immediately.</p>
    """
    return send_email(to_email, subject, html)