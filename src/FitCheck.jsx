import { useState, useRef, useCallback } from "react";

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

function BreakdownCard({ label, value, score }) {
  const [expanded, setExpanded] = useState(false);
  const preview = value.length > 60 ? value.slice(0, 60).trimEnd() + "…" : value;
  const needsToggle = value.length > 60;

  return (
    <div style={{ padding: "18px 20px", background: C.white }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{
          fontSize: 9,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
        }}>
          {label}
        </div>
        {score != null && (
          <div style={{ fontSize: 11, color: C.taupe, fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
            {score}<span style={{ fontSize: 9, color: C.muted }}>/10</span>
          </div>
        )}
      </div>
      <div style={{
        fontSize: 13,
        color: C.black,
        lineHeight: 1.6,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      }}>
        {expanded ? value : preview}
      </div>
      {needsToggle && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginTop: 6,
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.taupe,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            cursor: "pointer",
          }}
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}


export default function FitCheck() {
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysis(null);
    setError(null);
    setLoading(true);

    const base64 = await compressImage(file);
    setImage(base64);

    try {
      const res = await fetch("/api/analyze-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64, mimeType: 'image/jpeg' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error ${res.status}`);
      }
      setAnalysis(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.black,
      fontFamily: "'Garamond', 'EB Garamond', 'Times New Roman', serif",
    }}>
      <style>{`
@keyframes fc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fc-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fc-fade { animation: fc-fade 0.5s ease forwards; }
        .fc-upload:hover { border-color: ${C.taupe} !important; }
        .fc-btn:hover { background: ${C.black} !important; color: ${C.white} !important; }
        .fc-back:hover { color: ${C.brown} !important; }

        /* Desktop layout */
        .fc-header { padding: 20px 24px; }
        .fc-main { padding: 0 24px 60px; }
        .fc-results {
          padding-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 48px;
          align-items: start;
        }
        .fc-image-col { display: block; }
        .fc-score-mobile { display: none; }
        .fc-score-desktop { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 24px; border-bottom: 1px solid ${C.border}; }
        .fc-breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${C.border}; }

        /* Mobile layout */
        @media (max-width: 680px) {
          .fc-header { padding: 16px 20px; }
          .fc-main { padding: 0 16px 48px; }
          .fc-upload-box { padding: 56px 24px !important; }
          .fc-results {
            grid-template-columns: 1fr !important;
            gap: 28px;
            padding-top: 24px;
          }
          .fc-image-col { display: flex; gap: 16px; align-items: flex-start; }
          .fc-image-thumb { flex: 0 0 120px; width: 120px; }
          .fc-score-mobile { display: block; flex: 1; padding-top: 24px; }
          .fc-score-desktop { display: none !important; }
          .fc-breakdown-grid { grid-template-columns: 1fr !important; }
          .fc-overall-text { font-size: 15px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="fc-header" style={{
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: C.taupe,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            marginBottom: 4,
          }}>
            Style Analysis
          </div>
          <div style={{
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: "0.05em",
            color: C.black,
            fontStyle: "italic",
          }}>
            FitCheck
          </div>
        </div>
        {image && (
          <button
            onClick={reset}
            className="fc-back"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.taupe,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              transition: "color 0.2s",
            }}
          >
            New Analysis
          </button>
        )}
      </header>

      <main className="fc-main" style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Upload state */}
        {!image && (
          <div className="fc-fade" style={{ paddingTop: 60 }}>
            <div
              className="fc-upload fc-upload-box"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "80px 40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "center",
                transition: "border-color 0.3s",
                background: C.white,
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFile}
                accept="image/*"
                style={{ display: "none" }}
              />
              <div style={{ width: 1, height: 48, background: C.border, marginBottom: 32 }} />
              <div style={{
                fontSize: 22,
                fontWeight: 400,
                color: C.black,
                marginBottom: 12,
                letterSpacing: "0.02em",
                fontStyle: "italic",
              }}>
                Upload your look
              </div>
              <div style={{
                fontSize: 12,
                color: C.taupe,
                marginBottom: 40,
                lineHeight: 1.8,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.05em",
                maxWidth: 260,
              }}>
                Full-body photograph recommended for comprehensive analysis
              </div>
              <button
                className="fc-btn"
                style={{
                  padding: "12px 36px",
                  background: C.white,
                  color: C.black,
                  border: `1px solid ${C.black}`,
                  borderRadius: 1,
                  fontSize: 11,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                Select Image
              </button>
            </div>
          </div>
        )}

        {/* Results state */}
        {image && (
          <div className="fc-fade fc-results">

            {/* Left — image (+ score on mobile) */}
            <div className="fc-image-col">
              {/* Image */}
              <div className="fc-image-thumb">
                <div style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: C.muted,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  marginBottom: 12,
                }}>
                  Submitted Look
                </div>
                <div style={{
                  aspectRatio: "3/4",
                  overflow: "hidden",
                  background: C.card,
                  position: "relative",
                }}>
                  <img
                    src={image}
                    alt="Your fit"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {loading && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(250,250,248,0.88)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 16,
                    }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        border: `1px solid ${C.muted}`,
                        borderTopColor: C.brown,
                        borderRadius: "50%",
                        animation: "fc-spin 0.9s linear infinite",
                      }} />
                      <div style={{
                        fontSize: 10,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: C.taupe,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                      }}>
                        Analyzing
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Score — mobile only, shown to the right of the thumbnail */}
              {analysis && (
                <div className="fc-score-mobile">
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter', sans-serif", fontWeight: 400, marginBottom: 6, textAlign: "center" }}>Score</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 16 }}>
                    <span style={{ fontSize: 44, fontWeight: 400, color: C.black, lineHeight: 1, fontStyle: "italic" }}>{analysis.score}</span>
                    <span style={{ fontSize: 15, color: C.muted, fontStyle: "italic" }}>/10</span>
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter', sans-serif", fontWeight: 400, marginBottom: 6 }}>Verdict</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: C.brown, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>{analysis.verdict}</div>
                </div>
              )}
            </div>

            {/* Right — analysis */}
            <div>
              {error && (
                <div style={{
                  padding: "16px 20px",
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  color: C.brown,
                  fontSize: 12,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.03em",
                  lineHeight: 1.6,
                }}>
                  {error}
                </div>
              )}

              {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[80, 120, 100, 140].map((h, i) => (
                    <div key={i} style={{ height: h, background: C.card, opacity: 0.6 }} />
                  ))}
                </div>
              )}

              {analysis && (
                <div className="fc-fade" style={{ display: "flex", flexDirection: "column", gap: 36 }}>

                  {/* Score & Verdict — desktop only */}
                  <div className="fc-score-desktop">
                    <div>
                      <div style={{
                        fontSize: 10,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: C.muted,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        marginBottom: 6,
                      }}>
                        Score
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 56, fontWeight: 400, color: C.black, lineHeight: 1, fontStyle: "italic" }}>
                          {analysis.score}
                        </span>
                        <span style={{ fontSize: 18, color: C.muted, fontStyle: "italic" }}>/10</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 10,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: C.muted,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        marginBottom: 6,
                      }}>
                        Verdict
                      </div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 400,
                        color: C.brown,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {analysis.verdict}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div>
                    <div style={{
                      fontSize: 10,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: C.muted,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      marginBottom: 16,
                    }}>
                      Breakdown
                    </div>
                    <div className="fc-breakdown-grid">
                      {Object.entries(analysis.breakdown || {}).map(([key, val]) => (
                        <BreakdownCard key={key} label={key} value={val} score={analysis.scores?.[key]} />
                      ))}
                    </div>
                  </div>

                  {/* Highlight */}
                  <div style={{ borderLeft: `2px solid ${C.brownLight}`, paddingLeft: 20 }}>
                    <div style={{
                      fontSize: 9,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: C.brownLight,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      marginBottom: 8,
                    }}>
                      What is Working
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: C.black,
                      lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                    }}>
                      {analysis.highlight}
                    </div>
                  </div>

                  {/* Fix */}
                  <div style={{ borderLeft: `2px solid ${C.brown}`, paddingLeft: 20 }}>
                    <div style={{
                      fontSize: 9,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: C.brown,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      marginBottom: 8,
                    }}>
                      The Edit
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: C.black,
                      lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                    }}>
                      {analysis.fix}
                    </div>
                  </div>

                  {/* Suggestion */}
                  {analysis.suggestion && (
                    <div style={{ background: C.card, padding: "20px 24px" }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, fontFamily: "'Inter', sans-serif", fontWeight: 400, marginBottom: 10 }}>
                        Shop the Look
                      </div>
                      <div style={{ fontSize: 14, color: C.black, fontFamily: "'Inter', sans-serif", fontWeight: 400, marginBottom: 6 }}>
                        {analysis.suggestion.item}
                      </div>
                      <div style={{ fontSize: 12, color: C.taupe, fontFamily: "'Inter', sans-serif", fontWeight: 400, lineHeight: 1.6, marginBottom: 14 }}>
                        {analysis.suggestion.reason}
                      </div>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(analysis.suggestion.search)}&tbm=shop`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: C.black,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 400,
                          border: `1px solid ${C.black}`,
                          padding: "8px 20px",
                          textDecoration: "none",
                          transition: "background 0.2s, color 0.2s",
                        }}
                        onMouseEnter={e => { e.target.style.background = C.black; e.target.style.color = C.white; }}
                        onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = C.black; }}
                      >
                        Find it on Google Shopping
                      </a>
                    </div>
                  )}

                  {/* Overall */}
                  <div style={{ paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
                    <div style={{
                      fontSize: 10,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: C.muted,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      marginBottom: 14,
                    }}>
                      Editorial Take
                    </div>
                    <div className="fc-overall-text" style={{
                      fontSize: 16,
                      color: C.black,
                      lineHeight: 1.9,
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}>
                      {analysis.overall}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: C.muted,
                      marginTop: 24,
                      letterSpacing: "0.15em",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      textTransform: "uppercase",
                    }}>
                      — FitCheck by Styld Studio
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
