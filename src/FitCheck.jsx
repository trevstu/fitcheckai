import { useState, useRef, useCallback, useEffect } from "react";

const C = {
  bg: "#FAFAF8",
  white: "#FFFFFF",
  black: "#0A0A0A",
  brown: "#5C3D2E",
  brownLight: "#8B6914",
  taupe: "#6B5B52",
  border: "#E8E0D8",
  card: "#F5F0EB",
  muted: "#7A6B63",
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

const CATEGORIES = [
  "Casual", "Streetwear", "Business Casual", "Chic",
  "Formal", "Athletic", "Date Night", "Going Out", "Festival", "Vintage",
];

const ACTION_STYLE = {
  add:    { label: "ADD",    color: "#2D6A4F", bg: "#ECFDF5" },
  swap:   { label: "SWAP",   color: "#92400E", bg: "#FFFBEB" },
  remove: { label: "REMOVE", color: "#9B1C2E", bg: "#FFF1F2" },
};

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

export default function FitCheck() {
  const [stage, setStage] = useState("upload");
  const [image, setImage] = useState(null);
  const [inspirationImage, setInspirationImage] = useState(null);
  const [category, setCategory] = useState(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);

  const fileInputRef = useRef(null);
  const inspirationRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImage(file);
    setImage(base64);
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
      const res = await fetch("/api/analyze-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: image, mimeType: "image/jpeg", category, stylePrompt, inspirationImage }),
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
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
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
    setStage("upload"); setImage(null); setInspirationImage(null);
    setCategory(null); setStylePrompt(""); setAnalysis(null);
    setError(null); setMessages([]); setChatInput(""); setShowInspiration(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (inspirationRef.current) inspirationRef.current.value = "";
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.black, fontFamily: "'Garamond','EB Garamond','Times New Roman',serif" }}>
      <style>{`
        @keyframes fc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fc-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-slide { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fc-fade { animation: fc-fade 0.4s ease forwards; }
        .fc-slide { animation: fc-slide 0.35s ease forwards; }
        .fc-upload-area:hover { border-color: ${C.taupe} !important; }
        .fc-btn:hover { background: ${C.black} !important; color: ${C.white} !important; }
        .fc-back:hover { color: ${C.brown} !important; }
        .fc-cat:hover { border-color: ${C.taupe} !important; }
        .fc-send:hover { opacity: 0.75; }
        .fc-inspo:hover { color: ${C.brown} !important; }
        .fc-categories { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .fc-categories::-webkit-scrollbar { display: none; }
        .fc-chat-input:focus { outline: none; border-color: ${C.taupe} !important; }
        .fc-chat-input::placeholder { color: ${C.muted}; }
        .fc-textarea:focus { outline: none; border-color: ${C.taupe} !important; }
        .fc-textarea::placeholder { color: ${C.muted}; }

        .fc-main { padding: 0 48px 80px; max-width: 1100px; margin: 0 auto; }
        .fc-results-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 56px; align-items: start; padding-top: 48px; }
        .fc-image-sticky { position: sticky; top: 24px; }

        @media (max-width: 680px) {
          .fc-main { padding: 0 16px 60px; }
          .fc-results-grid { grid-template-columns: 1fr; gap: 28px; padding-top: 24px; }
          .fc-image-sticky { position: static; }
          .fc-header-pad { padding: 16px 20px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="fc-header-pad" style={{ padding: "20px 48px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 4 }}>
            Style Analysis
          </div>
          <div style={{ fontSize: 26, fontWeight: 400, letterSpacing: "0.05em", color: C.black, fontStyle: "italic" }}>
            FitCheck
          </div>
        </div>
        {stage !== "upload" && (
          <button onClick={reset} className="fc-back" style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.taupe, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
            New Look
          </button>
        )}
      </header>

      <main className="fc-main">

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <div className="fc-fade" style={{ paddingTop: 60 }}>
            <div
              className="fc-upload-area"
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `1px solid ${C.border}`, borderRadius: 2, padding: "80px 40px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", textAlign: "center", transition: "border-color 0.3s", background: C.white }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" style={{ display: "none" }} />
              <div style={{ width: 1, height: 48, background: C.border, marginBottom: 32 }} />
              <div style={{ fontSize: 22, fontWeight: 400, color: C.black, marginBottom: 12, letterSpacing: "0.02em", fontStyle: "italic" }}>
                Drop your fit
              </div>
              <div style={{ fontSize: 12, color: C.taupe, marginBottom: 40, lineHeight: 1.8, fontFamily: "'Inter',sans-serif", fontWeight: 400, letterSpacing: "0.05em", maxWidth: 260 }}>
                Full-body photo works best
              </div>
              <button className="fc-btn" style={{ padding: "12px 36px", background: C.white, color: C.black, border: `1px solid ${C.black}`, borderRadius: 1, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 400, transition: "background 0.2s, color 0.2s" }}>
                Select Photo
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {stage === "configure" && (
          <div className="fc-slide" style={{ paddingTop: 40, maxWidth: 600, margin: "0 auto" }}>

            {/* Photo preview */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
              <div style={{ flex: "0 0 100px", aspectRatio: "3/4", overflow: "hidden", background: C.card }}>
                <img src={image} alt="Your fit" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 18, fontStyle: "italic", fontWeight: 400, color: C.black, marginBottom: 6 }}>Looking good.</div>
                <div style={{ fontSize: 12, color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400, lineHeight: 1.7 }}>
                  Tell your stylist a bit more so we can give you the best read.
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: "12px 16px", background: C.white, border: `1px solid ${C.border}`, color: C.brown, fontSize: 12, fontFamily: "'Inter',sans-serif", marginBottom: 20 }}>
                {error}
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 12 }}>
                Style Category
              </div>
              <div className="fc-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className="fc-cat"
                    onClick={() => setCategory(cat === category ? null : cat)}
                    style={{
                      padding: "7px 16px", borderRadius: 100, border: `1px solid ${category === cat ? C.black : C.border}`,
                      background: category === cat ? C.black : C.white, color: category === cat ? C.white : C.taupe,
                      fontSize: 11, fontFamily: "'Inter',sans-serif", fontWeight: 400, cursor: "pointer",
                      whiteSpace: "nowrap", transition: "all 0.15s",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Style prompt */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 12 }}>
                What's the look?
              </div>
              <textarea
                className="fc-textarea"
                value={stylePrompt}
                onChange={e => setStylePrompt(e.target.value)}
                placeholder="e.g. going for a clean minimal vibe, dinner with friends…"
                rows={3}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${C.border}`, background: C.white, fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 400, color: C.black, lineHeight: 1.6, resize: "none", borderRadius: 2, boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
            </div>

            {/* Inspiration */}
            <div style={{ marginBottom: 36 }}>
              <button
                className="fc-inspo"
                onClick={() => setShowInspiration(v => !v)}
                style={{ background: "none", border: "none", padding: 0, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400, cursor: "pointer", transition: "color 0.2s" }}
              >
                {showInspiration ? "− Remove Inspiration" : "+ Add Inspiration Photo"}
              </button>
              {showInspiration && (
                <div style={{ marginTop: 16 }}>
                  <input type="file" ref={inspirationRef} onChange={handleInspirationFile} accept="image/*" style={{ display: "none" }} />
                  {inspirationImage ? (
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 64, height: 64, overflow: "hidden", background: C.card }}>
                        <img src={inspirationImage} alt="Inspiration" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button onClick={() => { setInspirationImage(null); if (inspirationRef.current) inspirationRef.current.value = ""; }} style={{ background: "none", border: "none", fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => inspirationRef.current?.click()} style={{ border: `1px dashed ${C.border}`, padding: "20px", textAlign: "center", cursor: "pointer", background: C.white }}>
                      <div style={{ fontSize: 12, color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400 }}>Tap to upload inspiration photo</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analyze */}
            <button
              onClick={analyze}
              className="fc-btn"
              style={{ width: "100%", padding: "14px", background: C.black, color: C.white, border: `1px solid ${C.black}`, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 400, transition: "opacity 0.2s" }}
            >
              Analyze My Fit
            </button>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {stage === "analyzing" && (
          <div className="fc-fade" style={{ paddingTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ width: 28, height: 28, border: `1px solid ${C.muted}`, borderTopColor: C.brown, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
            <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400 }}>
              Reading your fit…
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && analysis && (
          <div className="fc-fade fc-results-grid">

            {/* Left — image */}
            <div className="fc-image-sticky">
              <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 12 }}>
                Submitted Look
              </div>
              <div style={{ aspectRatio: "3/4", overflow: "hidden", background: C.card }}>
                <img src={image} alt="Your fit" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              {inspirationImage && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 8 }}>Inspiration</div>
                  <div style={{ aspectRatio: "3/4", overflow: "hidden", background: C.card }}>
                    <img src={inspirationImage} alt="Inspiration" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Right — analysis */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* Vibe */}
              <div style={{ paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 8 }}>The Vibe</div>
                <div style={{ fontSize: 36, fontStyle: "italic", fontWeight: 400, color: C.black, letterSpacing: "0.02em" }}>{analysis.vibe}</div>
              </div>

              {/* Moves */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 14 }}>The Moves</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(analysis.moves || []).map((move, i) => {
                    const s = ACTION_STYLE[move.action] || ACTION_STYLE.swap;
                    return (
                      <div key={i} style={{ padding: "14px 16px", background: s.bg, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 9, letterSpacing: "0.2em", color: s.color, fontFamily: "'Inter',sans-serif", fontWeight: 400, textTransform: "uppercase", paddingTop: 2, flexShrink: 0 }}>
                          {s.label}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, color: C.black, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 2 }}>{move.item}</div>
                          <div style={{ fontSize: 12, color: C.taupe, fontFamily: "'Inter',sans-serif", fontWeight: 400, lineHeight: 1.5 }}>{move.reason}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 14 }}>Breakdown</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: C.border }}>
                  {Object.entries(analysis.breakdown || {}).map(([key, val]) => (
                    <div key={key} style={{ padding: "14px 16px", background: C.white }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 5 }}>{key}</div>
                      <div style={{ fontSize: 12, color: C.black, fontFamily: "'Inter',sans-serif", fontWeight: 400, lineHeight: 1.5 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlight */}
              <div style={{ borderLeft: `2px solid ${C.brownLight}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: C.brownLight, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 6 }}>What's Working</div>
                <div style={{ fontSize: 13, color: C.black, fontFamily: "'Inter',sans-serif", fontWeight: 400, lineHeight: 1.6 }}>{analysis.highlight}</div>
              </div>

              {/* Chat */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter',sans-serif", fontWeight: 400, marginBottom: 16 }}>
                  Your Stylist
                </div>

                {/* Messages */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
                        background: msg.role === "user" ? C.black : C.white,
                        color: msg.role === "user" ? C.white : C.black,
                        border: msg.role === "user" ? "none" : `1px solid ${C.border}`,
                        fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 400, lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        borderBottomRightRadius: msg.role === "user" ? 2 : 12,
                        borderBottomLeftRadius: msg.role === "assistant" ? 2 : 12,
                      }}>
                        {parseChatMessage(msg.content).map((part, j) =>
                          part.type === "link" ? (
                            <a key={j} href={`https://www.google.com/search?q=${encodeURIComponent(part.query)}&tbm=shop`} target="_blank" rel="noopener noreferrer"
                              style={{ color: msg.role === "user" ? "#93C5FD" : C.brownLight, textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}>
                              {part.label}
                            </a>
                          ) : (
                            <span key={j}>{part.content}</span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: "10px 16px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, borderBottomLeftRadius: 2 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `fc-spin 1s ease ${i * 0.15}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="fc-chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Reply to your stylist…"
                    style={{ flex: 1, padding: "11px 14px", border: `1px solid ${C.border}`, background: C.white, fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 400, color: C.black, borderRadius: 2, transition: "border-color 0.2s" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="fc-send"
                    style={{ padding: "11px 20px", background: C.black, color: C.white, border: "none", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: chatInput.trim() ? "pointer" : "default", fontFamily: "'Inter',sans-serif", fontWeight: 400, opacity: chatInput.trim() ? 1 : 0.4, borderRadius: 2, transition: "opacity 0.2s" }}
                  >
                    Send
                  </button>
                </div>

                <div style={{ fontSize: 10, color: C.muted, marginTop: 24, letterSpacing: "0.15em", fontFamily: "'Inter',sans-serif", fontWeight: 400, textTransform: "uppercase" }}>
                  — FitCheck by Styld Studio
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
