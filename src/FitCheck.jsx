import { useState, useRef, useCallback, useEffect } from "react";

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
  const NUM = 5;
  const frames = [];
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
    const next = () => {
      if (i >= times.length) { URL.revokeObjectURL(url); resolve(frames); return; }
      video.currentTime = times[i];
    };
    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL("image/jpeg", 0.8));
      i++; next();
    };
    next();
  };

  video.onloadedmetadata = () => {
    if (!isFinite(video.duration)) {
      video.currentTime = knownDuration || 15;
      const onSeek = () => { video.removeEventListener("seeked", onSeek); doExtract(video.currentTime); };
      video.addEventListener("seeked", onSeek);
    } else {
      doExtract(video.duration);
    }
  };
  video.onerror = () => { URL.revokeObjectURL(url); resolve(frames); };
  video.load();
});

export default function FitCheck() {
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

  const fileInputRef = useRef(null);
  const videoFileRef = useRef(null);
  const inspirationRef = useRef(null);
  const chatEndRef = useRef(null);
  const liveVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartRef = useRef(null);
  const frameCaptureRef = useRef([]);
  const frameCaptureIntervalRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    return () => stopStream();
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false });
      streamRef.current = stream;
      setStage("recording");
      setTimeout(() => {
        if (liveVideoRef.current) { liveVideoRef.current.srcObject = stream; }
      }, 50);
    } catch {
      setCameraError("Camera access was denied. Allow camera access in your browser settings, or upload a video instead.");
    }
  };

  const captureFrameFromCamera = () => {
    const video = liveVideoRef.current;
    if (!video || video.readyState < 2) return;
    const MAX = 720;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    frameCaptureRef.current.push(canvas.toDataURL("image/jpeg", 0.8));
  };

  const startRecording = () => {
    chunksRef.current = [];
    frameCaptureRef.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      clearInterval(frameCaptureIntervalRef.current);
      stopStream();
      setFrames(frameCaptureRef.current.length > 0 ? [...frameCaptureRef.current] : null);
      setStage("configure");
    };
    mr.start();
    recordingStartRef.current = Date.now();
    captureFrameFromCamera();
    frameCaptureIntervalRef.current = setInterval(captureFrameFromCamera, 3000);
    setRecording(true);
    setCountdown(15);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { stopRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = useCallback(() => {
    clearInterval(countdownRef.current);
    clearInterval(frameCaptureIntervalRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();
    setRecording(false);
  }, []);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImage(file);
    setImage(base64); setFrames(null);
    setStage("configure");
  }, []);

  const handleVideoFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("analyzing");
    const extracted = await extractFrames(file);
    setFrames(extracted); setImage(null);
    setStage("configure");
  }, []);

  const handleInspirationFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImage(file);
    setInspirationImage(base64);
  }, []);

  const analyze = async () => {
    setStage("analyzing");
    setError(null);
    try {
      const body = frames
        ? { frames, category, stylePrompt, inspirationImage, isVideo: true }
        : { base64Image: image, mimeType: "image/jpeg", category, stylePrompt, inspirationImage };
      const res = await fetch("/api/analyze-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      setAnalysis(data);
      setMessages([{ role: "assistant", content: data.question }]);
      setStage("results");
    } catch (err) {
      setError(err.message);
      setStage("configure");
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, context: { category, stylePrompt, analysis } }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const reset = () => {
    stopStream(); clearInterval(countdownRef.current); clearInterval(frameCaptureIntervalRef.current);
    setStage("upload"); setImage(null); setFrames(null); setInspirationImage(null);
    setCategory(null); setStylePrompt(""); setAnalysis(null);
    setError(null); setMessages([]); setChatInput(""); setShowInspiration(false);
    setRecording(false); setCountdown(15); setCameraError(null);
    [fileInputRef, videoFileRef, inspirationRef].forEach(r => { if (r.current) r.current.value = ""; });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','SF Pro Display',-apple-system,Helvetica,sans-serif" }}>
      <style>{`
        @keyframes fc-spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fc-fade  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-slide { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
        .fc-fade  { animation: fc-fade  0.45s ease forwards; }
        .fc-slide { animation: fc-slide 0.4s ease forwards; }
        .fc-btn-primary:hover  { opacity: 0.85 !important; }
        .fc-btn-surface:hover  { background: ${C.surfaceHigh} !important; border-color: ${C.purple} !important; }
        .fc-back:hover         { color: ${C.white} !important; }
        .fc-send:hover         { opacity: 0.8 !important; }
        .fc-inspo:hover        { color: ${C.purpleLight} !important; }
        .fc-categories { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .fc-categories::-webkit-scrollbar { display:none; }
        .fc-chat-input:focus { outline:none; border-color:${C.purple} !important; }
        .fc-chat-input::placeholder { color:${C.muted}; }
        .fc-textarea:focus { outline:none; border-color:${C.purple} !important; }
        .fc-textarea::placeholder { color:${C.muted}; }
        .fc-main { padding: 0 48px 80px; max-width: 1100px; margin: 0 auto; }
        .fc-results-grid { display:grid; grid-template-columns:1fr 1.5fr; gap:56px; align-items:start; padding-top:48px; }
        .fc-image-sticky { position:sticky; top:24px; }
        @media (max-width: 680px) {
          .fc-main { padding: 0 16px 60px; }
          .fc-results-grid { grid-template-columns:1fr; gap:28px; padding-top:24px; }
          .fc-image-sticky { position:static; }
          .fc-header-pad { padding: 16px 20px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="fc-header-pad" style={{ padding: "20px 48px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 400, marginBottom: 3 }}>Style Analysis</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>STYLD</div>
        </div>
        {stage !== "upload" && (
          <button onClick={reset} className="fc-back" style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 400, transition: "color 0.25s" }}>
            New Look
          </button>
        )}
      </header>

      <main className="fc-main">

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <div className="fc-fade" style={{ paddingTop: 56, maxWidth: 520, margin: "0 auto" }}>

            {cameraError && (
              <div style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, color: "#DC2626", fontSize: 12, marginBottom: 20, lineHeight: 1.6, borderRadius: 14 }}>
                {cameraError}
              </div>
            )}

            {/* Record — primary CTA */}
            <button
              onClick={startCamera}
              className="fc-btn-primary"
              style={{ width: "100%", padding: "36px 20px", background: C.purple, color: C.white, border: "none", borderRadius: 20, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12, transition: "opacity 0.25s" }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Record your fit check</div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>Up to 15 seconds</div>
            </button>

            {/* Secondary options */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 400, letterSpacing: "0.1em" }}>or</div>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" style={{ display: "none" }} />
              <input type="file" ref={videoFileRef} onChange={handleVideoFile} accept="video/*" style={{ display: "none" }} />
              <button
                className="fc-btn-surface"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "18px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400, transition: "background 0.25s, border-color 0.25s" }}
              >
                Upload Photo
              </button>
              <button
                className="fc-btn-surface"
                onClick={() => videoFileRef.current?.click()}
                style={{ padding: "18px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400, transition: "background 0.25s, border-color 0.25s" }}
              >
                Upload Video
              </button>
            </div>
          </div>
        )}

        {/* ── RECORDING ── */}
        {stage === "recording" && (
          <div className="fc-fade" style={{ paddingTop: 24, maxWidth: 520, margin: "0 auto" }}>
            <div style={{ position: "relative", background: "#000", overflow: "hidden", borderRadius: 20 }}>
              <video
                ref={liveVideoRef}
                autoPlay playsInline muted
                style={{ width: "100%", display: "block", maxHeight: "65vh", objectFit: "cover" }}
              />
              {recording && (
                <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", animation: "fc-pulse 1.2s ease infinite" }} />
                  <span style={{ color: C.white, fontSize: 13, fontWeight: 500, letterSpacing: "0.1em" }}>
                    {countdown}s
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="fc-btn-primary"
                  style={{ flex: 1, padding: "16px", background: "#EF4444", color: C.white, border: "none", borderRadius: 14, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500, transition: "opacity 0.25s" }}
                >
                  Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="fc-btn-primary"
                  style={{ flex: 1, padding: "16px", background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500, transition: "opacity 0.25s" }}
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => { stopStream(); clearInterval(countdownRef.current); setRecording(false); setStage("upload"); }}
                style={{ padding: "16px 20px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontWeight: 400 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {stage === "configure" && (
          <div className="fc-slide" style={{ paddingTop: 40, maxWidth: 600, margin: "0 auto" }}>

            {/* Preview */}
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
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 6 }}>
                  {frames ? "Nice moves." : "Looking good."}
                </div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 400, lineHeight: 1.7 }}>
                  Tell your stylist a bit more for the best read.
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, color: "#DC2626", fontSize: 12, marginBottom: 20, borderRadius: 14 }}>
                {error}
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>Style Category</div>
              <div className="fc-categories">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat === category ? null : cat)}
                    style={{ padding: "8px 18px", borderRadius: 100, border: `1px solid ${category === cat ? C.purple : C.border}`, background: category === cat ? C.purple : C.surface, color: category === cat ? C.white : C.muted, fontSize: 11, fontWeight: 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Style prompt */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>What's the look?</div>
              <textarea className="fc-textarea" value={stylePrompt} onChange={e => setStylePrompt(e.target.value)}
                placeholder="e.g. going for a clean minimal vibe, dinner with friends…" rows={3}
                style={{ width: "100%", padding: "14px 16px", border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 400, color: C.text, lineHeight: 1.6, resize: "none", borderRadius: 14, boxSizing: "border-box", transition: "border-color 0.25s" }}
              />
            </div>

            {/* Inspiration */}
            <div style={{ marginBottom: 36 }}>
              <button className="fc-inspo" onClick={() => setShowInspiration(v => !v)}
                style={{ background: "none", border: "none", padding: 0, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 400, cursor: "pointer", transition: "color 0.25s" }}>
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
                        style={{ background: "none", border: "none", fontSize: 11, color: C.muted, cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => inspirationRef.current?.click()} style={{ border: `1px dashed ${C.border}`, padding: "22px", textAlign: "center", cursor: "pointer", background: C.surface, borderRadius: 14 }}>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>Tap to upload inspiration photo</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={analyze} className="fc-btn-primary"
              style={{ width: "100%", padding: "16px", background: C.purple, color: C.white, border: "none", fontSize: 13, letterSpacing: "0.05em", fontWeight: 600, cursor: "pointer", transition: "opacity 0.25s", borderRadius: 14 }}>
              Analyze My Fit
            </button>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {stage === "analyzing" && (
          <div className="fc-fade" style={{ paddingTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
            <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 400 }}>
              {frames ? "Reading your video…" : "Reading your fit…"}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && analysis && (
          <div className="fc-fade">

            {/* Vibe Hero */}
            <div style={{ paddingTop: 48, paddingBottom: 32, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>The Vibe</div>
              <div style={{ fontSize: 58, fontWeight: 400, fontStyle: "italic", fontFamily: "'EB Garamond','Garamond','Times New Roman',serif", letterSpacing: "0.01em", lineHeight: 1.1, color: C.text }}>{analysis.vibe}</div>
            </div>

          <div className="fc-results-grid">

            {/* Left */}
            <div className="fc-image-sticky">
              <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 12 }}>
                {frames ? "Submitted Video" : "Submitted Look"}
              </div>
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

              {/* Highlight */}
              <div style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 18 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: C.purple, fontWeight: 600, marginBottom: 7 }}>What's Working</div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 400, lineHeight: 1.6 }}>{analysis.highlight}</div>
              </div>

              {/* Moves */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 14 }}>The Moves</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(analysis.moves || []).map((move, i) => {
                    const s = ACTION_STYLE[move.action] || ACTION_STYLE.swap;
                    return (
                      <div key={i} style={{ padding: "16px 18px", background: s.bg, display: "flex", gap: 14, alignItems: "flex-start", borderRadius: 14, border: `1px solid rgba(0,0,0,0.04)` }}>
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

              {/* Chat */}
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
                    style={{ flex: 1, padding: "13px 20px", border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 400, color: C.text, borderRadius: 26, transition: "border-color 0.25s" }} />
                  <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading} className="fc-send"
                    style={{ padding: "13px 22px", background: C.purple, color: C.white, border: "none", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: chatInput.trim() ? "pointer" : "default", fontWeight: 600, opacity: chatInput.trim() ? 1 : 0.35, borderRadius: 26, transition: "opacity 0.25s" }}>
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
