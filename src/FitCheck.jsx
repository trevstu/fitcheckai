import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  bg:            "#F4F4F5",
  surface:       "#FFFFFF",
  surfaceHigh:   "#F0F0F1",
  purple:        "#8B5CF6",
  purpleLight:   "#A78BFA",
  white:         "#FFFFFF",
  text:          "#0A0A0A",
  textSecondary: "#71717A",
  border:        "#E4E4E7",
  muted:         "#71717A",
};

const CATEGORIES = [
  "Casual", "Streetwear", "Business Casual", "Chic",
  "Formal", "Athletic", "Date Night", "Going Out", "Festival", "Vintage",
];

const ACTION_STYLE = {
  add:    { label: "ADD",    color: "#16A34A", bg: "#F0FDF4" },
  swap:   { label: "SWAP",   color: "#D97706", bg: "#FFFBEB" },
  remove: { label: "REMOVE", color: "#DC2626", bg: "#FFF1F2" },
};

const PROFILE_DEFAULTS = { name: "", gender: "", fit_preference: "", budget: "", favorite_brands: "", climate: "" };

function parseChatMessage(text) {
  const parts = [];
  const regex = /\[([^\]]+)\]\s*\(([^)]+)\)/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    parts.push({ type: "link", label: match[1], query: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts.length ? parts : [{ type: "text", content: text }];
}

const compressClosetImage = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 480;
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
      else { width = Math.round(width * MAX / height); height = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg", 0.75));
  };
  img.src = url;
});

const compressImage = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 1500;
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
      else { width = Math.round(width * MAX / height); height = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg", 0.85));
  };
  img.src = url;
});

const extractFrames = (blob, knownDuration) => new Promise((resolve) => {
  const video = document.createElement("video");
  const url = URL.createObjectURL(blob);
  video.src = url; video.muted = true; video.playsInline = true;
  const NUM = 5; const frames = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const doExtract = (duration) => {
    const MAX = 720;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    canvas.width = w; canvas.height = h;
    const times = Array.from({ length: NUM }, (_, i) => (i / (NUM - 1)) * duration);
    let i = 0;
    const next = () => { if (i >= times.length) { URL.revokeObjectURL(url); resolve(frames); return; } video.currentTime = times[i]; };
    video.onseeked = () => { ctx.drawImage(video, 0, 0, w, h); frames.push(canvas.toDataURL("image/jpeg", 0.8)); i++; next(); };
    next();
  };
  video.onloadedmetadata = () => {
    if (!isFinite(video.duration)) {
      video.currentTime = knownDuration || 15;
      const onSeek = () => { video.removeEventListener("seeked", onSeek); doExtract(video.currentTime); };
      video.addEventListener("seeked", onSeek);
    } else { doExtract(video.duration); }
  };
  video.onerror = () => { URL.revokeObjectURL(url); resolve(frames); };
  video.load();
});

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(value === opt ? "" : opt)}
          style={{ padding: "7px 16px", borderRadius: 100, border: `1px solid ${value === opt ? C.purple : C.border}`, background: value === opt ? C.purple : C.surface, color: value === opt ? C.white : C.muted, fontSize: 12, fontWeight: 400, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function FitCheck({ user, onSignOut }) {
  const [stage, setStage] = useState("upload");
  const [image, setImage] = useState(null);
  const [frames, setFrames] = useState(null);
  const [inspirationImage, setInspirationImage] = useState(null);
  const [category, setCategory] = useState(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [cameraError, setCameraError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(PROFILE_DEFAULTS);
  const [profileSaving, setProfileSaving] = useState(false);
  const [closet, setCloset] = useState([]);
  const [closetTagging, setClosetTagging] = useState(false);
  const [editingClosetId, setEditingClosetId] = useState(null);
  const [editingClosetLabel, setEditingClosetLabel] = useState("");

  const fileInputRef = useRef(null);
  const videoFileRef = useRef(null);
  const inspirationRef = useRef(null);
  const closetInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const liveVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartRef = useRef(null);
  const frameCaptureRef = useRef([]);
  const frameCaptureIntervalRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);
  useEffect(() => { return () => stopStream(); }, []);
  useEffect(() => { if (user) { loadProfile(); loadCloset(); } }, [user]);

  const stopStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfileForm(data);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, ...profileForm, updated_at: new Date().toISOString() });
    setProfileSaving(false);
    setShowProfile(false);
  };

  const updateProfile = (key, val) => setProfileForm(p => ({ ...p, [key]: val }));

  const loadCloset = async () => {
    if (!user) return;
    const { data } = await supabase.from("closet_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCloset(data || []);
  };

  const handleClosetFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setClosetTagging(true);
    try {
      const base64 = await compressClosetImage(file);
      const res = await fetch("/api/tag-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64Image: base64, mimeType: "image/jpeg" }) });
      const { label, item_type } = await res.json();
      const { data } = await supabase.from("closet_items").insert({ user_id: user.id, image: base64, label: label || "Clothing item", item_type: item_type || "other" }).select().single();
      if (data) setCloset(prev => [data, ...prev]);
    } catch (err) { console.error("Failed to tag item:", err); }
    finally { setClosetTagging(false); if (closetInputRef.current) closetInputRef.current.value = ""; }
  };

  const deleteClosetItem = async (id) => {
    await supabase.from("closet_items").delete().eq("id", id);
    setCloset(prev => prev.filter(item => item.id !== id));
  };

  const saveClosetLabel = async (id) => {
    const label = editingClosetLabel.trim();
    if (!label) return;
    await supabase.from("closet_items").update({ label }).eq("id", id);
    setCloset(prev => prev.map(item => item.id === id ? { ...item, label } : item));
    setEditingClosetId(null);
  };

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase.from("fit_history").select("id, image, frames, category, style_prompt, analysis, created_at").order("created_at", { ascending: false }).limit(24);
    setHistory(data || []);
    setHistoryLoading(false);
  }, [user]);

  const viewHistoryItem = (item) => {
    setImage(item.image); setFrames(item.frames); setCategory(item.category);
    setStylePrompt(item.style_prompt || ""); setAnalysis(item.analysis);
    setMessages([{ role: "assistant", content: item.analysis.question }]);
    setStage("results");
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false });
      streamRef.current = stream; setStage("recording");
      setTimeout(() => { if (liveVideoRef.current) liveVideoRef.current.srcObject = stream; }, 50);
    } catch { setCameraError("Camera access was denied. Allow camera access in your browser settings, or upload a video instead."); }
  };

  const captureFrameFromCamera = () => {
    const video = liveVideoRef.current;
    if (!video || video.readyState < 2) return;
    const MAX = 720; let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    frameCaptureRef.current.push(canvas.toDataURL("image/jpeg", 0.8));
  };

  const startRecording = () => {
    chunksRef.current = []; frameCaptureRef.current = [];
    const mr = new MediaRecorder(streamRef.current); mediaRecorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => { clearInterval(frameCaptureIntervalRef.current); stopStream(); setFrames(frameCaptureRef.current.length > 0 ? [...frameCaptureRef.current] : null); setStage("configure"); };
    mr.start(); recordingStartRef.current = Date.now();
    frameCaptureIntervalRef.current = setInterval(captureFrameFromCamera, 3000);
    setRecording(true); setCountdown(15);
    countdownRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { stopRecording(); return 0; } return prev - 1; }); }, 1000);
  };

  const stopRecording = useCallback(() => {
    clearInterval(countdownRef.current); clearInterval(frameCaptureIntervalRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();
    setRecording(false);
  }, []);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const base64 = await compressImage(file); setImage(base64); setFrames(null); setStage("configure");
  }, []);

  const handleVideoFile = useCallback(async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setStage("analyzing"); const extracted = await extractFrames(file); setFrames(extracted); setImage(null); setStage("configure");
  }, []);

  const handleInspirationFile = useCallback(async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const base64 = await compressImage(file); setInspirationImage(base64);
  }, []);

  const analyze = async () => {
    setStage("analyzing"); setError(null);
    try {
      const profile = Object.values(profileForm).some(v => v) ? profileForm : null;
      const closetLabels = closet.map(i => i.label).filter(Boolean);
      const body = frames
        ? { frames, category, stylePrompt, inspirationImage, isVideo: true, profile, closetItems: closetLabels }
        : { base64Image: image, mimeType: "image/jpeg", category, stylePrompt, inspirationImage, profile, closetItems: closetLabels };
      const res = await fetch("/api/analyze-fit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      setAnalysis(data); setMessages([{ role: "assistant", content: data.question }]); setStage("results");
      if (user) {
        supabase.from("fit_history").insert({ user_id: user.id, image: frames ? null : image, frames: frames || null, category, style_prompt: stylePrompt, analysis: data }).then(() => {});
      }
    } catch (err) { setError(err.message); setStage("configure"); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updated, context: { category, stylePrompt, analysis } }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again?" }]); }
    finally { setChatLoading(false); }
  };

  const shareCard = async () => {
    await document.fonts.ready;
    const src = frames?.[0] || image;
    if (!src) return;
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#F4F4F5"; ctx.fillRect(0, 0, W, H);
      const ia = img.width / img.height, ca = W / H;
      let dw, dh, dx, dy;
      if (ia > ca) { dh = H; dw = H * ia; dx = (W - dw) / 2; dy = 0; }
      else { dw = W; dh = W / ia; dx = 0; dy = (H - dh) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
      const grad = ctx.createLinearGradient(0, H * 0.48, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "italic 700 88px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "left"; ctx.fillText(analysis.vibe, 64, H - 140);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 30px Inter, Helvetica, sans-serif";
      ctx.fillText("STYLD", 64, H - 76);
      ctx.fillStyle = "#8B5CF6"; ctx.fillRect(0, H - 8, W, 8);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "styld-fit.jpg", { type: "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file] }); } catch {}
        } else {
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "styld-fit.jpg"; a.click();
        }
      }, "image/jpeg", 0.92);
    };
    img.src = src;
  };

  const reset = () => {
    stopStream(); clearInterval(countdownRef.current); clearInterval(frameCaptureIntervalRef.current);
    setStage("upload"); setImage(null); setFrames(null); setInspirationImage(null);
    setCategory(null); setStylePrompt(""); setAnalysis(null);
    setError(null); setMessages([]); setChatInput(""); setShowInspiration(false);
    setRecording(false); setCountdown(15); setCameraError(null);
    [fileInputRef, videoFileRef, inspirationRef].forEach(r => { if (r.current) r.current.value = ""; });
  };

  const headerBtn = { fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 400, transition: "color 0.25s", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','SF Pro Display',-apple-system,Helvetica,sans-serif" }}>
      <style>{`
        @keyframes fc-spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fc-fade  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-slide { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
        @keyframes fc-panel { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .fc-fade  { animation: fc-fade  0.45s ease forwards; }
        .fc-slide { animation: fc-slide 0.4s ease forwards; }
        .fc-panel { animation: fc-panel 0.3s ease forwards; }
        .fc-btn-primary:hover  { opacity: 0.85 !important; }
        .fc-btn-surface:hover  { background: ${C.surfaceHigh} !important; border-color: ${C.purple} !important; }
        .fc-back:hover         { color: ${C.text} !important; }
        .fc-send:hover         { opacity: 0.8 !important; }
        .fc-inspo:hover        { color: ${C.purpleLight} !important; }
        .fc-share:hover        { background: ${C.surfaceHigh} !important; }
        .fc-history-item:hover { opacity: 0.82; transform: translateY(-2px); }
        .fc-categories { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .fc-categories::-webkit-scrollbar { display:none; }
        .fc-chat-input:focus { outline:none; border-color:${C.purple} !important; }
        .fc-chat-input::placeholder { color:${C.muted}; }
        .fc-textarea:focus { outline:none; border-color:${C.purple} !important; }
        .fc-textarea::placeholder { color:${C.muted}; }
        .fc-profile-input:focus { outline:none; border-color:${C.purple} !important; }
        .fc-profile-input::placeholder { color:${C.muted}; }
        .fc-main { padding: 0 48px 80px; max-width: 1100px; margin: 0 auto; }
        .fc-results-grid { display:grid; grid-template-columns:1fr 1.5fr; gap:56px; align-items:start; padding-top:48px; }
        .fc-history-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .fc-image-sticky { position:sticky; top:24px; }
        @media (max-width: 680px) {
          .fc-main { padding: 0 16px 60px; }
          .fc-results-grid { grid-template-columns:1fr; gap:28px; padding-top:24px; }
          .fc-history-grid { grid-template-columns:repeat(2,1fr); }
          .fc-image-sticky { position:static; }
          .fc-header-pad { padding: 16px 20px !important; }
        }
      `}</style>

      {/* Profile Panel */}
      {showProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowProfile(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div className="fc-panel" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 440, background: C.white, overflowY: "auto", padding: "32px 28px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Your Profile</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", fontSize: 18, color: C.muted, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Name</div>
                <input className="fc-profile-input" value={profileForm.name} onChange={e => updateProfile("name", e.target.value)} placeholder="First name"
                  style={{ width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, borderRadius: 12, boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.25s" }} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Gender</div>
                <PillGroup options={["Woman", "Man", "Non-binary", "Prefer not to say"]} value={profileForm.gender} onChange={v => updateProfile("gender", v)} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Fit Preference</div>
                <PillGroup options={["Oversized", "Regular", "Slim"]} value={profileForm.fit_preference} onChange={v => updateProfile("fit_preference", v)} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Budget Per Item</div>
                <PillGroup options={["Under $50", "$50–150", "$150–300", "$300+"]} value={profileForm.budget} onChange={v => updateProfile("budget", v)} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Favorite Brands</div>
                <input className="fc-profile-input" value={profileForm.favorite_brands} onChange={e => updateProfile("favorite_brands", e.target.value)} placeholder="e.g. Zara, Nike, Aritzia…"
                  style={{ width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, borderRadius: 12, boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.25s" }} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>Climate</div>
                <PillGroup options={["Warm", "Mild", "Cold"]} value={profileForm.climate} onChange={v => updateProfile("climate", v)} />
              </div>
            </div>

            <button onClick={saveProfile} disabled={profileSaving}
              style={{ width: "100%", padding: "15px", background: C.purple, color: C.white, border: "none", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 40, opacity: profileSaving ? 0.6 : 1, transition: "opacity 0.25s", fontFamily: "inherit" }}>
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fc-header-pad" style={{ padding: "20px 48px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>STYLD</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {user && stage === "upload" && (<>
            <button onClick={() => setShowProfile(true)} className="fc-back" style={headerBtn}>Profile</button>
            <button onClick={() => setStage("closet")} className="fc-back" style={headerBtn}>Closet</button>
            <button onClick={() => { loadHistory(); setStage("history"); }} className="fc-back" style={headerBtn}>History</button>
          </>)}
          {stage === "closet" && (
            <button onClick={() => setStage("upload")} className="fc-back" style={headerBtn}>← Back</button>
          )}
          {stage !== "upload" && stage !== "closet" && (
            <button onClick={reset} className="fc-back" style={headerBtn}>New Look</button>
          )}
          {user && (
            <button onClick={onSignOut} style={{ ...headerBtn, color: C.border }}
              onMouseEnter={e => e.currentTarget.style.color = C.muted}
              onMouseLeave={e => e.currentTarget.style.color = C.border}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="fc-main">

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <div className="fc-fade" style={{ paddingTop: 56, maxWidth: 520, margin: "0 auto" }}>
            {cameraError && (
              <div style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, color: "#DC2626", fontSize: 12, marginBottom: 20, lineHeight: 1.6, borderRadius: 14 }}>{cameraError}</div>
            )}
            <button onClick={startCamera} className="fc-btn-primary"
              style={{ width: "100%", padding: "36px 20px", background: C.purple, color: C.white, border: "none", borderRadius: 20, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12, transition: "opacity 0.25s" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Record your fit check</div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>Up to 15 seconds</div>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 400, letterSpacing: "0.1em" }}>or</div>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" style={{ display: "none" }} />
              <input type="file" ref={videoFileRef} onChange={handleVideoFile} accept="video/*" style={{ display: "none" }} />
              <input type="file" ref={closetInputRef} onChange={handleClosetFile} accept="image/*" style={{ display: "none" }} />
              <button className="fc-btn-surface" onClick={() => fileInputRef.current?.click()}
                style={{ padding: "18px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400, transition: "background 0.25s, border-color 0.25s" }}>
                Upload Photo
              </button>
              <button className="fc-btn-surface" onClick={() => videoFileRef.current?.click()}
                style={{ padding: "18px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400, transition: "background 0.25s, border-color 0.25s" }}>
                Upload Video
              </button>
            </div>
          </div>
        )}

        {/* ── RECORDING ── */}
        {stage === "recording" && (
          <div className="fc-fade" style={{ paddingTop: 24, maxWidth: 520, margin: "0 auto" }}>
            <div style={{ position: "relative", background: "#000", overflow: "hidden", borderRadius: 20 }}>
              <video ref={liveVideoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "cover" }} />
              {recording && (
                <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", animation: "fc-pulse 1.2s ease infinite" }} />
                  <span style={{ color: C.white, fontSize: 13, fontWeight: 500, letterSpacing: "0.1em" }}>{countdown}s</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {!recording ? (
                <button onClick={startRecording} className="fc-btn-primary"
                  style={{ flex: 1, padding: "16px", background: "#EF4444", color: C.white, border: "none", borderRadius: 14, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500, transition: "opacity 0.25s" }}>
                  Record
                </button>
              ) : (
                <button onClick={stopRecording} className="fc-btn-primary"
                  style={{ flex: 1, padding: "16px", background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500, transition: "opacity 0.25s" }}>
                  Stop
                </button>
              )}
              <button onClick={() => { stopStream(); clearInterval(countdownRef.current); setRecording(false); setStage("upload"); }}
                style={{ padding: "16px 20px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {stage === "configure" && (
          <div className="fc-slide" style={{ paddingTop: 40, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
              {frames ? (
                <div style={{ display: "flex", gap: 3, flex: "0 0 auto" }}>
                  {[0, 2, 4].map(i => frames[i] && (
                    <div key={i} style={{ width: 56, aspectRatio: "9/16", overflow: "hidden", background: C.surface, borderRadius: 10 }}>
                      <img src={frames[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ flex: "0 0 90px", aspectRatio: "3/4", overflow: "hidden", background: C.surface, borderRadius: 12 }}>
                  <img src={image} alt="Your fit" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 6 }}>{frames ? "Nice moves." : "Looking good."}</div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 400, lineHeight: 1.7 }}>Tell your stylist a bit more for the best read.</div>
              </div>
            </div>

            {error && <div style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, color: "#DC2626", fontSize: 12, marginBottom: 20, borderRadius: 14 }}>{error}</div>}

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>Style Category</div>
              <div className="fc-categories">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat === category ? null : cat)}
                    style={{ padding: "8px 18px", borderRadius: 100, border: `1px solid ${category === cat ? C.purple : C.border}`, background: category === cat ? C.purple : C.surface, color: category === cat ? C.white : C.muted, fontSize: 11, fontWeight: 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", fontFamily: "inherit" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>What's the look?</div>
              <textarea className="fc-textarea" value={stylePrompt} onChange={e => setStylePrompt(e.target.value)}
                placeholder="e.g. going for a clean minimal vibe, dinner with friends…" rows={3}
                style={{ width: "100%", padding: "14px 16px", border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 400, color: C.text, lineHeight: 1.6, resize: "none", borderRadius: 14, boxSizing: "border-box", transition: "border-color 0.25s", fontFamily: "inherit" }} />
            </div>

            <div style={{ marginBottom: 36 }}>
              <button className="fc-inspo" onClick={() => setShowInspiration(v => !v)}
                style={{ background: "none", border: "none", padding: 0, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 400, cursor: "pointer", transition: "color 0.25s", fontFamily: "inherit" }}>
                {showInspiration ? "− Remove Inspiration" : "+ Add Inspiration Photo"}
              </button>
              {showInspiration && (
                <div style={{ marginTop: 16 }}>
                  <input type="file" ref={inspirationRef} onChange={handleInspirationFile} accept="image/*" style={{ display: "none" }} />
                  {inspirationImage ? (
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 64, height: 64, overflow: "hidden", background: C.surface, borderRadius: 10 }}>
                        <img src={inspirationImage} alt="Inspiration" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button onClick={() => { setInspirationImage(null); if (inspirationRef.current) inspirationRef.current.value = ""; }}
                        style={{ background: "none", border: "none", fontSize: 11, color: C.muted, cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "inherit" }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => inspirationRef.current?.click()}
                      style={{ border: `1px dashed ${C.border}`, padding: "22px", textAlign: "center", cursor: "pointer", background: C.surface, borderRadius: 14 }}>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>Tap to upload inspiration photo</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={analyze} className="fc-btn-primary"
              style={{ width: "100%", padding: "16px", background: C.purple, color: C.white, border: "none", fontSize: 13, letterSpacing: "0.05em", fontWeight: 600, cursor: "pointer", transition: "opacity 0.25s", borderRadius: 14, fontFamily: "inherit" }}>
              Analyze My Fit
            </button>
          </div>
        )}

        {/* ── CLOSET ── */}
        {stage === "closet" && (
          <div className="fc-fade" style={{ paddingTop: 48 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 8 }}>My Closet</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Add photos of items you own — your stylist will reference them during analysis.</div>
            <input type="file" ref={closetInputRef} onChange={handleClosetFile} accept="image/*" style={{ display: "none" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div onClick={() => !closetTagging && closetInputRef.current?.click()}
                style={{ aspectRatio: "1", border: `1px dashed ${C.border}`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: closetTagging ? "default" : "pointer", background: C.surface, gap: 8, transition: "border-color 0.2s" }}>
                {closetTagging ? (
                  <div style={{ width: 22, height: 22, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
                ) : (
                  <>
                    <div style={{ fontSize: 24, color: C.muted, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, fontWeight: 400 }}>Add Item</div>
                  </>
                )}
              </div>
              {closet.map(item => (
                <div key={item.id} style={{ position: "relative" }}>
                  <div style={{ aspectRatio: "1", overflow: "hidden", background: C.surface, borderRadius: 14, marginBottom: 6 }}>
                    <img src={item.image} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  {editingClosetId === item.id ? (
                    <input
                      autoFocus
                      value={editingClosetLabel}
                      onChange={e => setEditingClosetLabel(e.target.value)}
                      onBlur={() => saveClosetLabel(item.id)}
                      onKeyDown={e => { if (e.key === "Enter") saveClosetLabel(item.id); if (e.key === "Escape") setEditingClosetId(null); }}
                      style={{ width: "100%", fontSize: 11, color: C.text, fontWeight: 400, lineHeight: 1.4, border: "none", borderBottom: `1px solid ${C.purple}`, background: "transparent", outline: "none", fontFamily: "inherit", padding: "2px 0", boxSizing: "border-box" }}
                    />
                  ) : (
                    <div onClick={() => { setEditingClosetId(item.id); setEditingClosetLabel(item.label); }}
                      style={{ fontSize: 11, color: C.text, fontWeight: 400, lineHeight: 1.4, paddingRight: 4, cursor: "text" }}>{item.label}</div>
                  )}
                  <button onClick={() => deleteClosetItem(item.id)}
                    style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: "inherit" }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            {closet.length === 0 && !closetTagging && (
              <div style={{ paddingTop: 48, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>No items yet</div>
                <div style={{ fontSize: 13, color: C.muted }}>Tap + to add your first piece.</div>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYZING ── */}
        {stage === "analyzing" && (
          <div className="fc-fade" style={{ paddingTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
            <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 400 }}>{frames ? "Reading your video…" : "Reading your fit…"}</div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {stage === "history" && (
          <div className="fc-fade" style={{ paddingTop: 48 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 24 }}>Your Fits</div>
            {historyLoading ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>No fits yet</div>
                <div style={{ fontSize: 13, color: C.muted }}>Submit your first look to get started.</div>
              </div>
            ) : (
              <div className="fc-history-grid">
                {history.map(item => {
                  const thumb = item.frames?.[0] || item.image;
                  const date = new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={item.id} className="fc-history-item" onClick={() => viewHistoryItem(item)} style={{ cursor: "pointer", transition: "opacity 0.2s, transform 0.2s" }}>
                      <div style={{ aspectRatio: "3/4", overflow: "hidden", background: C.surface, borderRadius: 14, marginBottom: 8 }}>
                        {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 400, fontStyle: "italic", fontFamily: "'EB Garamond','Garamond',serif", color: C.text, marginBottom: 2 }}>{item.analysis?.vibe}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{date}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && analysis && (
          <div className="fc-fade">
            <div style={{ paddingTop: 48, paddingBottom: 32, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>The Vibe</div>
                <div style={{ fontSize: 58, fontWeight: 400, fontStyle: "italic", fontFamily: "'EB Garamond','Garamond','Times New Roman',serif", letterSpacing: "0.01em", lineHeight: 1.1, color: C.text }}>{analysis.vibe}</div>
              </div>
              <button onClick={shareCard} className="fc-share"
                style={{ flexShrink: 0, padding: "10px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 11, fontWeight: 500, color: C.text, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", transition: "background 0.2s", fontFamily: "inherit", marginBottom: 6 }}>
                Share
              </button>
            </div>

            <div className="fc-results-grid">
              {/* Left */}
              <div className="fc-image-sticky">
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>{frames ? "Submitted Video" : "Submitted Look"}</div>
                {frames ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {frames.slice(0, 4).map((f, i) => (
                      <div key={i} style={{ aspectRatio: "9/16", overflow: "hidden", background: C.surface, borderRadius: 12 }}>
                        <img src={f} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ aspectRatio: "3/4", overflow: "hidden", background: C.surface, borderRadius: 16 }}>
                    <img src={image} alt="Your fit" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                {inspirationImage && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 8 }}>Inspiration</div>
                    <div style={{ aspectRatio: "3/4", overflow: "hidden", background: C.surface, borderRadius: 16 }}>
                      <img src={inspirationImage} alt="Inspiration" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Right */}
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <div style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 18 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: C.purple, fontWeight: 600, marginBottom: 7 }}>What's Working</div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 400, lineHeight: 1.6 }}>{analysis.highlight}</div>
                </div>

                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 14 }}>The Moves</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(analysis.moves || []).map((move, i) => {
                      const s = ACTION_STYLE[move.action] || ACTION_STYLE.swap;
                      return (
                        <div key={i} style={{ padding: "16px 18px", background: s.bg, display: "flex", gap: 14, alignItems: "flex-start", borderRadius: 14, border: "1px solid rgba(0,0,0,0.04)" }}>
                          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: s.color, fontWeight: 700, textTransform: "uppercase", paddingTop: 3, flexShrink: 0 }}>{s.label}</span>
                          <div>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3 }}>{move.item}</div>
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 400, lineHeight: 1.5 }}>{move.reason}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 28 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 16 }}>Your Stylist</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                    {messages.map((msg, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "11px 16px", borderRadius: 18, background: msg.role === "user" ? C.purple : C.surface, color: msg.role === "user" ? C.white : C.text, border: msg.role === "user" ? "none" : `1px solid ${C.border}`, fontSize: 13, fontWeight: 400, lineHeight: 1.55, whiteSpace: "pre-wrap", borderBottomRightRadius: msg.role === "user" ? 4 : 18, borderBottomLeftRadius: msg.role === "assistant" ? 4 : 18 }}>
                          {parseChatMessage(msg.content).map((part, j) =>
                            part.type === "link" ? (
                              <a key={j} href={`https://www.google.com/search?q=${encodeURIComponent(part.query)}&tbm=shop`} target="_blank" rel="noopener noreferrer"
                                style={{ color: msg.role === "user" ? "#C4B5FD" : C.purpleLight, textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}>
                                {part.label}
                              </a>
                            ) : <span key={j}>{part.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ padding: "13px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, borderBottomLeftRadius: 4 }}>
                          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `fc-pulse 1.2s ease ${i * 0.2}s infinite` }} />)}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="fc-chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Reply to your stylist…"
                      style={{ flex: 1, padding: "13px 20px", border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 400, color: C.text, borderRadius: 26, transition: "border-color 0.25s", fontFamily: "inherit" }} />
                    <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading} className="fc-send"
                      style={{ padding: "13px 22px", background: "#6D28D9", color: C.white, border: "none", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: chatInput.trim() ? "pointer" : "default", fontWeight: 600, opacity: chatInput.trim() ? 1 : 0.35, borderRadius: 26, transition: "opacity 0.25s", fontFamily: "inherit" }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
