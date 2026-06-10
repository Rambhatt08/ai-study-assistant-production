import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// === SCI-FI GAME LOADER COMPONENT ===
const LoadingOverlay = ({ isVisible, text }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="relative flex items-center justify-center w-32 h-32">
        <div className="absolute inset-0 border-4 border-slate-800 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.2)]"></div>
        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-3 border-4 border-slate-800 rounded-full"></div>
        <div className="absolute inset-3 border-4 border-emerald-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        <div className="absolute inset-6 border-4 border-slate-800 rounded-full"></div>
        <div className="absolute inset-6 border-4 border-purple-500 border-l-transparent rounded-full animate-spin" style={{ animationDuration: '0.8s' }}></div>
        <div className="absolute text-3xl animate-pulse">🧠</div>
      </div>
      <h3 className="mt-8 text-sm font-bold tracking-[0.3em] text-indigo-400 uppercase animate-pulse text-center px-4">{text}</h3>
      <div className="w-64 h-1 mt-6 bg-slate-800 rounded-full overflow-hidden shadow-[0_0_10px_rgba(79,70,229,0.4)]">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full animate-pulse w-full"></div>
      </div>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "");
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || ""); 
  const [authMode, setAuthMode] = useState("login");
  
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", otp: "", newToken: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null); // <-- NEW: State for Audio/Video files
  const [loading, setLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const [chatHistory, setChatHistory] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [flashcards, setFlashcards] = useState(null);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const BACKEND_URL = "http://localhost:8000";
  // const BACKEND_URL = "https://ai-study-assistant-qcde.onrender.com";
  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const tokenParam = params.get("token");
    if (modeParam === "reset-password" && tokenParam) {
      setAuthMode("reset");
      setAuthForm((prev) => ({ ...prev, newToken: tokenParam }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccessMsg(""); 
    try {
      if (authMode === "register") {
        const res = await fetch(`${BACKEND_URL}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: authForm.name, email: authForm.email, password: authForm.password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);
        setAuthMode("otp");
      } else if (authMode === "otp") {
        const res = await fetch(`${BACKEND_URL}/api/auth/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email, otp: authForm.otp }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);
        localStorage.setItem("token", data.token); localStorage.setItem("userName", data.name); localStorage.setItem("userEmail", data.email);
        setToken(data.token); setUserName(data.name); setUserEmail(data.email);
      } else if (authMode === "login") {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email, password: authForm.password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);
        localStorage.setItem("token", data.token); localStorage.setItem("userName", data.name); localStorage.setItem("userEmail", data.email);
        setToken(data.token); setUserName(data.name); setUserEmail(data.email);
      } else if (authMode === "forgot") {
        const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);
        setAuthSuccessMsg(data.message);
      } else if (authMode === "reset") {
        const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: authForm.newToken, new_password: authForm.password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);
        setAuthSuccessMsg("Password changed successfully!");
        setTimeout(() => { setAuthMode("login"); setAuthForm({...authForm, password: ""}); setAuthSuccessMsg(""); }, 3000);
      }
    } catch (err) { setAuthError(err.message); } 
    finally { setAuthLoading(false); }
  };

  const logout = () => {
    localStorage.clear();
    setToken(""); setUserName(""); setUserEmail(""); setGeneratedNotes(null); setHistory([]); setAuthMode("login"); resetDocument();
  };

  const fetchHistory = async () => {
    if (!token || !userEmail) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notes/history?email=${userEmail}`);
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (err) { console.error(err); }
  };

  const fetchAnalytics = async () => {
    if (!token || !userEmail) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analytics?email=${userEmail}`);
      const data = await res.json();
      if (data.success) setAnalytics(data);
    } catch (err) { console.error("Failed to fetch analytics:", err); }
    finally { setAnalyticsLoading(false); }
  };

  useEffect(() => { 
    fetchHistory(); 
    if (activeTab === "dashboard") fetchAnalytics();
  }, [token, userEmail, activeTab]);

  const resetQuiz = () => { setQuizData(null); setCurrentQuestion(0); setUserAnswers({}); setShowResults(false); };
  
  const resetDocument = () => { 
    resetQuiz(); 
    setChatHistory([]); 
    setFlashcards(null); 
    stopSpeaking(); 
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault(); if (!youtubeUrl.trim()) return;
    setLoading(true); setError(""); setGeneratedNotes(null); resetDocument();
    try {
      const response = await fetch(`${BACKEND_URL}/api/notes/youtube?email=${userEmail}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: youtubeUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setGeneratedNotes({ _id: data.note_id, title: data.title, content: data.content }); 
      setYoutubeUrl(""); fetchHistory(); setActiveTab("notes"); // Fixed setting tab to notes
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handlePdfSubmit = async (e) => {
    e.preventDefault(); if (!pdfFile) return;
    setLoading(true); setError(""); setGeneratedNotes(null); resetDocument();
    const formData = new FormData(); formData.append("file", pdfFile);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notes/pdf?email=${userEmail}`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setGeneratedNotes({ _id: data.note_id, title: data.title, content: data.content }); 
      setPdfFile(null); fetchHistory(); setActiveTab("notes"); // Fixed setting tab to notes
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // === NEW: Audio/Video Submission Handler ===
  const handleMediaSubmit = async (e) => {
    e.preventDefault(); if (!mediaFile) return;
    setLoading(true); setError(""); setGeneratedNotes(null); resetDocument();
    
    const formData = new FormData(); 
    formData.append("file", mediaFile);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/notes/media?email=${userEmail}`, { 
        method: "POST", 
        body: formData 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      
      setGeneratedNotes({ _id: data.note_id, title: data.title, content: data.content }); 
      setMediaFile(null); 
      fetchHistory(); 
      setActiveTab("notes");
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const generateFlashcards = async () => {
    if (!generatedNotes) return;
    setFlashcardLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/flashcards/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: generatedNotes.content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setFlashcards(data.flashcards); setIsFlipped(false);
    } catch (err) { alert("Failed to generate flashcards: " + err.message); } 
    finally { setFlashcardLoading(false); }
  };

  const handleFlashcardRating = (knewIt) => {
    setIsFlipped(false);
    setTimeout(() => {
      setFlashcards((prev) => {
        const current = [...prev];
        const card = current.shift(); 
        if (!knewIt) current.push(card); 
        return current;
      });
    }, 300); 
  };

  const generateQuiz = async () => {
    if (!generatedNotes) return;
    setQuizLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/quiz/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: generatedNotes.content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setQuizData(data.quiz);
    } catch (err) { alert("Failed to generate quiz: " + err.message); } 
    finally { setQuizLoading(false); }
  };

  const handleAnswerSelect = (option) => { setUserAnswers({ ...userAnswers, [currentQuestion]: option }); };

  const normalizeAnswer = (answer) => {
    if (!answer) return "";

    return answer
      .toString()
      .trim()
      .replace(/^Option\s*/i, "")
      .toUpperCase();
  };

  const calculateScore = () => {
    let score = 0;

    quizData.forEach((q, index) => {
      if (
        normalizeAnswer(userAnswers[index]) ===
        normalizeAnswer(q.correct_answer)
      ) {
        score++;
      }
    });

    return score;
  };

  const handleDownloadWord = () => {
    const originalElement = document.getElementById("pdf-content-area");
    if (!originalElement) return;
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333333; line-height: 1.6; } h1 { font-size: 20pt; color: #4f46e5; margin-bottom: 12pt; text-align: center; font-weight: bold; } h2 { font-size: 14pt; color: #3730a3; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; } h3 { font-size: 12pt; font-weight: bold; color: #111827; } p { margin-bottom: 10pt; } ul, ol { margin-left: 24px; margin-bottom: 12pt; } li { margin-bottom: 4pt; } code, pre { background-color: #f1f5f9; padding: 4px; color: #b91c1c; font-family: 'Courier New', Courier, monospace; font-size: 10pt; } blockquote { border-left: 4px solid #4f46e5; padding-left: 12px; font-style: italic; color: #475569; }</style></head><body>`;
    const postHtml = "</body></html>";
    const html = preHtml + `<h1>${generatedNotes.title}</h1>` + originalElement.innerHTML + postHtml;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a"); downloadLink.href = url; downloadLink.download = `${generatedNotes.title.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink); URL.revokeObjectURL(url);
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    
    // Clean markdown characters out of the text so it doesn't read them out loud
    const cleanText = text.replace(/[*_#`]/g, ''); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // === NEW: HUNT FOR THE BEST HUMAN VOICE ===
    const voices = window.speechSynthesis.getVoices();
    
    let bestVoice = 
      // 1. Edge/Windows "Natural" voices (These are the absolute best free voices)
      voices.find(v => v.name.includes("Natural") && v.lang.includes("en")) || 
      // 2. Chrome's official high-quality cloud voice
      voices.find(v => v.name === "Google US English") || 
      // 3. Apple's premium Mac/iOS voices
      voices.find(v => v.name.includes("Samantha") || v.name.includes("Siri")) || 
      // 4. Windows modern AI voices
      voices.find(v => v.name.includes("Aria") || v.name.includes("Jenny")) || 
      // 5. Fallback to basic US English
      voices.find(v => v.lang.startsWith("en-US"));

    // If we found a premium voice, attach it to the speech engine
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Tweak the speed and pitch to make it sound more relaxed and human
    utterance.rate = 0.95; 
    utterance.pitch = 1.05; 
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Try Google Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setChatMessage(transcript);
      await sendMessageToAI(transcript); 
    };
    recognition.onerror = (event) => {
      console.error("Speech error", event);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const sendMessageToAI = async (messageText) => {
    if (!messageText.trim()) return;
    const userMsg = { role: "user", text: messageText };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatMessage(""); 
    setChatLoading(true);
    stopSpeaking(); 

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ context: generatedNotes.content, message: userMsg.text, history: chatHistory }) 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error");
      
      setChatHistory((prev) => [...prev, { role: "ai", text: data.reply }]);
      speakText(data.reply); 
    } catch (err) {
      const safeErrorMsg = String(err.message || "An unknown error occurred.");
      setChatHistory((prev) => [...prev, { role: "ai", text: `❌ Error: ${safeErrorMsg}` }]);
    } finally { setChatLoading(false); }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendMessageToAI(chatMessage);
  };

  // UPDATED LOADING TEXT TO INCLUDE MEDIA
  let loaderText = "";
  if (authLoading) loaderText = "Logging you in...";
  else if (loading) loaderText = activeTab === 'media' ? "Analyzing Media (This takes a minute)..." : "Creating your notes...";
  else if (quizLoading) loaderText = "Creating your quiz...";
  else if (flashcardLoading) loaderText = "Making your flashcards...";

  if (!token) {
    return (
      <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-900 font-sans antialiased flex flex-col relative">
        <LoadingOverlay isVisible={authLoading} text={loaderText} />
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">🤖 AI Study Buddy</h1>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700">
              {isDarkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full transition-colors">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
              {authMode === "login" && "Welcome Back"}
              {authMode === "register" && "Create Account"}
              {authMode === "otp" && "Verify Email"}
              {authMode === "forgot" && "Reset Password"}
              {authMode === "reset" && "Establish New Password"}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
              {authMode === "register" && <input type="text" required placeholder="Full Name" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition" />}
              {(authMode === "login" || authMode === "register" || authMode === "forgot") && <input type="email" required placeholder="Email Address" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition" />}
              {(authMode === "login" || authMode === "register" || authMode === "reset") && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder={authMode === "reset" ? "Enter New Password" : "Password"} value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition bg-transparent">{showPassword ? "👁️" : "🙈"}</button>
                </div>
              )}
              {authMode === "otp" && <input type="text" required placeholder="6-Digit Code" value={authForm.otp} onChange={(e) => setAuthForm({...authForm, otp: e.target.value})} className="w-full px-4 py-3 text-center tracking-[0.5em] text-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition" />}
              {authError && <div className="p-3 bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm rounded-lg text-center">{authError}</div>}
              {authSuccessMsg && <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg text-center">{authSuccessMsg}</div>}
              <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition shadow-md">
                {authLoading ? "Processing..." : authMode === "login" ? "Sign In" : authMode === "register" ? "Sign Up" : authMode === "forgot" ? "Send Reset Link" : authMode === "reset" ? "Update Password" : "Verify & Enter"}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 space-y-2">
              {authMode === "login" && <><p><button type="button" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthSuccessMsg(""); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Forgot Password?</button></p><p>Don't have an account? <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccessMsg(""); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign up</button></p></>}
              {authMode === "register" && <p>Already have an account? <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccessMsg(""); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Log in</button></p>}
              {(authMode === "forgot" || authMode === "otp" || authMode === "reset") && <p><button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccessMsg(""); }} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">← Back to Log In</button></p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

// === UPGRADED SEARCH FILTER ===
  const filteredHistory = history.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Safely check if the title includes the search term
    const matchTitle = item.title && item.title.toLowerCase().includes(searchLower);
    
    // Safely check if the source_type (pdf, youtube, media) includes the search term
    const matchSource = item.source_type && item.source_type.toLowerCase().includes(searchLower);
    
    // Return true if EITHER the title OR the source type matches!
    return matchTitle || matchSource;
  });

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased relative">
      <LoadingOverlay isVisible={loading || quizLoading || flashcardLoading} text={loaderText} />

      <header className="border-b transition-colors duration-300 border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 cursor-pointer" onClick={() => setActiveTab("dashboard")}>🤖 AI Study Buddy</h1>
            <span className="hidden md:inline-block text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Student: {userName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="p-2 text-sm font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors">Log Out</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700">
              {isDarkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          
          {/* === UPDATED BUTTON BAR (ADDED MEDIA BUTTON) === */}
          <div className="flex p-1 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <button onClick={() => { setActiveTab("dashboard"); setError(""); }} className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>📊 Dashboard</button>
            <button onClick={() => { setActiveTab("youtube"); setError(""); }} className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "youtube" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>🎥 YouTube</button>
            <button onClick={() => { setActiveTab("pdf"); setError(""); }} className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "pdf" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>📄 PDF</button>
            <button onClick={() => { setActiveTab("media"); setError(""); }} className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "media" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>🎵 Audio/Video</button>
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {analyticsLoading ? (
                <div className="text-center py-10 text-slate-500">Loading your stats...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                      <div className="text-4xl mb-2">🔥</div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white">{analytics?.streak || 0}</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Day Streak</div>
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                      <div className="text-4xl mb-2">📚</div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white">{analytics?.total || 0}</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total Summaries</div>
                    </div>
                  </div>
                  
                  {/* FULL WIDTH TOP KEYWORDS - NO BAR CHART */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 text-center">Your Top Keywords</h3>
                      {analytics?.topics?.length > 0 ? (
                        <div className="flex flex-wrap gap-3 items-center justify-center overflow-hidden">
                          {analytics.topics.map((topic, idx) => {
                            const size = idx < 3 ? 'text-xl' : idx < 7 ? 'text-base' : 'text-sm';
                            const opacity = idx < 3 ? 'opacity-100 font-bold' : idx < 7 ? 'opacity-80 font-medium' : 'opacity-60';
                            return <span key={idx} className={`inline-block px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 transition-transform hover:scale-110 cursor-default ${size} ${opacity}`}>{topic.text}</span>;
                          })}
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-slate-400 text-sm text-center">Generate more notes to see your topic cloud!</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab !== "dashboard" && activeTab !== "notes" && (
            <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-colors">
              {activeTab === "youtube" ? (
                <form onSubmit={handleYoutubeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">YouTube Video URL</label>
                    <input type="url" required placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 transition"/>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-lg transition shadow-md">
                    {loading ? "Creating your notes..." : "Generate AI Notes ✨"}
                  </button>
                </form>
              ) : activeTab === "pdf" ? (
                <form onSubmit={handlePdfSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Upload Document (PDF)</label>
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group bg-white dark:bg-slate-900">
                      <input type="file" required accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                        {pdfFile ? <span className="text-indigo-600 dark:text-indigo-400 font-bold">{pdfFile.name}</span> : "Click to browse or drag PDF here"}
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !pdfFile} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-lg transition shadow-md">
                    {loading ? "Creating your notes..." : "Simplify PDF Document ✨"}
                  </button>
                </form>
              ) : (
                /* === NEW: Audio/Video Form UI === */
                <form onSubmit={handleMediaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Upload Audio or Video (.mp3, .mp4)</label>
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group bg-white dark:bg-slate-900">
                      <input type="file" required accept="audio/mp3, audio/mpeg, video/mp4" onChange={(e) => setMediaFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎧</div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                        {mediaFile ? <span className="text-indigo-600 dark:text-indigo-400 font-bold">{mediaFile.name}</span> : "Click to browse or drag MP3/MP4 here"}
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !mediaFile} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-lg transition shadow-md">
                    {loading ? "Analyzing Media (This may take a minute)..." : "Generate Notes from Media ✨"}
                  </button>
                </form>
              )}
              {error && <div className="mt-4 p-3 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm rounded-lg">{error}</div>}
            </div>
          )}

          {generatedNotes && activeTab === "notes" && (
            <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 animate-fade-in transition-colors">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{generatedNotes.title}</h3>
                <div className="flex gap-2">
                  <button onClick={handleDownloadWord} className="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-medium px-4 py-2 rounded-lg transition border border-indigo-200 dark:border-transparent">📄 Word</button>
                  <button onClick={generateFlashcards} disabled={flashcardLoading} className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-white font-medium px-4 py-2 rounded-lg transition border border-amber-200 dark:border-transparent">📇 Flashcards</button>
                  <button onClick={generateQuiz} disabled={quizLoading} className="text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white font-medium px-4 py-2 rounded-lg transition border border-emerald-200 dark:border-transparent">🧠 Quiz</button>
                </div>
              </div>

              <div id="pdf-content-area" className="prose prose-slate dark:prose-invert prose-indigo max-w-none text-slate-700 dark:text-slate-300 pt-2">
                <ReactMarkdown>{generatedNotes.content}</ReactMarkdown>
              </div>

              {/* === RAG CHAT WITH NEW VOICE ENGINE === */}
              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><span>💬</span> Chat with AI Tutor</h4>
                  {isSpeaking && (
                    <button onClick={stopSpeaking} className="text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                      🛑 Stop Audio
                    </button>
                  )}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto mb-4 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col">
                  {chatHistory.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 mt-10 my-auto italic">Ask me to explain a concept, summarize a section, or give examples!</p> : chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl p-3 shadow-sm whitespace-pre-wrap text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-none'}`}>
                        {String(msg.text || "")}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 rounded-bl-none text-slate-500 text-sm animate-pulse shadow-sm">Thinking...</div></div>}
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-2 relative">
                  <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Ask a question about these notes..." disabled={chatLoading || isListening} className="flex-1 pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition" />
                  
                  {/* MIC BUTTON */}
                  <button type="button" onClick={startListening} disabled={chatLoading || isListening} className={`absolute right-[90px] top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? "bg-rose-100 dark:bg-rose-500/20 text-rose-500 animate-pulse" : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"}`}>
                    🎙️
                  </button>

                  <button type="submit" disabled={chatLoading || !chatMessage.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition shadow-md flex items-center justify-center min-w-[80px]">Send</button>
                </form>
              </div>
            </div>
          )}

          {/* OVERLAY MODALS */}
          {flashcards && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Study Flashcards ({flashcards.length} left)</h3>
                  <button onClick={() => setFlashcards(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium">✕ Close</button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[400px]">
                  {flashcards.length === 0 ? (
                    <div className="text-center animate-fade-in">
                      <div className="text-6xl mb-4">🎉</div><h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">All Caught Up!</h2><p className="text-slate-500 dark:text-slate-400">You've mastered all the concepts for this document.</p><button onClick={() => setFlashcards(null)} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition">Back to Notes</button>
                    </div>
                  ) : (
                    <div className="w-full max-w-md flex flex-col items-center">
                      <div style={{ perspective: "1000px" }} className="relative w-full h-72 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                        <div style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }} className="w-full h-full transition-all duration-500 shadow-xl rounded-2xl relative">
                          <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center"><span className="absolute top-4 text-xs font-bold text-indigo-500 uppercase tracking-widest">Front • Term</span><h3 className="text-2xl font-bold text-slate-800 dark:text-white">{flashcards[0].term}</h3><span className="absolute bottom-4 text-xs text-slate-400">Click to flip ↺</span></div>
                          <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0 bg-indigo-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center"><span className="absolute top-4 text-xs font-bold text-indigo-200 uppercase tracking-widest">Back • Definition</span><p className="text-lg font-medium text-white overflow-y-auto">{flashcards[0].definition}</p></div>
                        </div>
                      </div>
                      <div className={`w-full flex gap-4 mt-8 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <button onClick={(e) => { e.stopPropagation(); handleFlashcardRating(false); }} className="flex-1 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-400 rounded-xl font-bold transition">Needs Practice</button>
                        <button onClick={(e) => { e.stopPropagation(); handleFlashcardRating(true); }} className="flex-1 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 rounded-xl font-bold transition">Got It</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {quizData && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 pt-20 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] mt-4">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{showResults ? "Quiz Results" : `Question ${currentQuestion + 1} of ${quizData.length}`}</h3>
                  <button onClick={resetQuiz} className="text-slate-500 hover:text-slate-500 dark:hover:text-white">✕ Close</button>
                </div>
                <div className="p-6 overflow-y-auto">
                  {!showResults ? (
                    <div className="space-y-6">
                      <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{quizData[currentQuestion].question}</p>
                      <div className="space-y-3">
                        {quizData[currentQuestion].options.map((option, idx) => (
                          <button key={idx} onClick={() => handleAnswerSelect(option)} className={`w-full text-left p-4 rounded-xl border transition-all ${userAnswers[currentQuestion] === option ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300"}`}>{option}</button>
                        ))}
                      </div>
                      <div className="flex justify-between pt-4">
                        <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(curr => curr - 1)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-50">Previous</button>
                        {currentQuestion === quizData.length - 1 ? <button disabled={!userAnswers[currentQuestion]} onClick={() => setShowResults(true)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50 transition">Submit Quiz</button> : <button disabled={!userAnswers[currentQuestion]} onClick={() => setCurrentQuestion(curr => curr + 1)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 transition">Next</button>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><h4 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Score: {calculateScore()} / {quizData.length}</h4><p className="text-slate-600 dark:text-slate-300">{calculateScore() === quizData.length ? "Perfect score! Outstanding work." : "Great effort! Review your answers below."}</p></div>
                      <div className="space-y-6">
                        {quizData.map((q, idx) => {
                        const isCorrect = normalizeAnswer(userAnswers[idx]) === normalizeAnswer(q.correct_answer);
                          
                          return (
                            <div key={idx} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                              <p className="font-medium text-slate-800 dark:text-slate-200 mb-4">{idx + 1}. {q.question}</p>
                              <div className="grid gap-2 mb-4">
                                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'}`}><span className="font-bold shrink-0">{isCorrect ? '✓' : '✗'} Your Answer:</span><span>{userAnswers[idx] || "Skipped"}</span></div>
                                {!isCorrect && <div className="p-3 rounded-lg text-sm flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"><span className="font-bold shrink-0">✓ Correct Answer:</span><span>{q.correct_answer}</span></div>}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"><strong>Explanation:</strong> {q.explanation}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR HISTORY */}
        <div className="space-y-4 relative z-0">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">📜 Saved History</h2>
          
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="🔍 Search titles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow" />
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900 p-2 space-y-1 shadow-sm dark:shadow-xl transition-colors">
            {filteredHistory.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No notes found.</div> : filteredHistory.map((item) => (
              <button key={item._id} onClick={() => { setActiveTab("notes"); setGeneratedNotes({ _id: item._id, title: item.title, content: item.content }); resetDocument(); }} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition flex flex-col space-y-2 group">
                <span className="text-sm text-slate-700 dark:text-slate-400 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">{item.title}</span>
                <div className="flex items-center justify-between text-[11px] text-slate-500 w-full">
                  <div className="flex gap-1.5 overflow-hidden items-center">
                    <span className="uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800">{item.source_type}</span>
                  </div>
                  <span className="shrink-0 pl-2">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-10">
        © 2026 AI Study Buddy. Developed by Ram Bhatt.
      </footer>
    </div>
  );
}