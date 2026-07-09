import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// ── Colors ─────────────────────────────────────────────────────────────────

const C = {
  bg:           "#FFFFFF",
  surface:      "#FFFFFF",
  surfaceHigh:  "#F4F4F5",
  purple:       "#8B5CF6",
  purpleLight:  "#A78BFA",
  white:        "#FFFFFF",
  text:         "#0A0A0A",
  border:       "#E4E4E7",
  muted:        "#71717A",
  sidebarBg:    "#18181B",
  sidebarText:  "#E4E4E7",
  sidebarMuted: "#52525B",
  sidebarActive:"#3F3F46",
};

const PROFILE_DEFAULTS = {
  name: "", gender: "", fit_preference: "", budget: "", favorite_brands: "", climate: "",
};

const STARTERS = [
  "I'm going to a rooftop party — help me pick 📸",
  "Rate my outfit options for tonight",
  "I need a date night look",
  "What should I wear to a casual brunch?",
];

// ── Helpers ────────────────────────────────────────────────────────────────

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
    const MAX = 1200;
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
      else { width = Math.round(width * MAX / height); height = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    resolve({ base64: canvas.toDataURL("image/jpeg", 0.85), mimeType: "image/jpeg" });
  };
  img.src = url;
});

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

function groupByDate(items) {
  const groups = {};
  const now = new Date();
  items.forEach(item => {
    const diff = Math.floor((now - new Date(item.created_at)) / 86400000);
    const label = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? "This Week" : diff < 30 ? "This Month" : "Older";
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return groups;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function WishlistButton({ label, query, onAdd }) {
  const [added, setAdded] = useState(false);
  return (
    <button
      onClick={() => { if (!added) { onAdd(label, query); setAdded(true); } }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 10, color: added ? C.muted : C.purple,
        background: added ? "transparent" : `${C.purple}12`,
        border: `1px solid ${added ? C.border : C.purple}40`,
        borderRadius: 100, padding: "2px 8px",
        cursor: added ? "default" : "pointer", fontWeight: 600,
        marginLeft: 4, verticalAlign: "middle", transition: "all 0.2s",
        fontFamily: "inherit",
      }}>
      {added ? "✓ saved" : "+ wishlist"}
    </button>
  );
}

function ChatBubble({ message, onAddWishlist }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginBottom: 16 }}>
        {message.hasImagePlaceholder && (
          <div style={{ background: `${C.purple}12`, borderRadius: 14, padding: "8px 14px", fontSize: 13, color: C.purple, border: `1px solid ${C.purple}30` }}>
            📷 Photo
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 260 }}>
            {message.images.map((img, i) => (
              <div key={i} style={{
                width: message.images.length === 1 ? 200 : 94,
                height: message.images.length === 1 ? 260 : 94,
                borderRadius: 14, overflow: "hidden", background: C.surfaceHigh, flexShrink: 0,
              }}>
                <img src={img.base64} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div style={{
            background: C.purple, color: C.white,
            borderRadius: "18px 18px 4px 18px",
            padding: "10px 16px", fontSize: 14, lineHeight: 1.55,
            maxWidth: 280, wordBreak: "break-word",
          }}>
            {message.content}
          </div>
        )}
      </div>
    );
  }

  const parts = parseChatMessage(message.content);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: C.purple,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, flexShrink: 0, color: C.white, fontWeight: 700,
      }}>✦</div>
      <div style={{
        background: "#F4F4F5",
        borderRadius: "18px 18px 18px 4px",
        padding: "10px 16px", fontSize: 14, lineHeight: 1.6,
        maxWidth: 300, wordBreak: "break-word", color: C.text,
      }}>
        {parts.map((part, i) => part.type === "text" ? (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part.content}</span>
        ) : (
          <span key={i}>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(part.query)}&tbm=shop`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: C.purple, textDecoration: "underline", fontWeight: 500 }}>
              {part.label}
            </a>
            <WishlistButton label={part.label} query={part.query} onAdd={onAddWishlist} />
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: C.white }}>✦</div>
      <div style={{ background: "#F4F4F5", borderRadius: "18px 18px 18px 4px", padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `fc-bounce 1.2s ease infinite ${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ conversations, currentId, onSelect, onNewChat, onClose, isMobile, visible }) {
  const groups = groupByDate(conversations);
  const ORDER = ["Today", "Yesterday", "This Week", "This Month", "Older"];

  const sidebarStyle = isMobile ? {
    position: "fixed", top: 0, bottom: 0,
    left: visible ? 0 : -280, width: 260,
    zIndex: 50, transition: "left 0.25s ease",
    background: C.sidebarBg, display: "flex", flexDirection: "column",
  } : {
    width: 260, flexShrink: 0,
    background: C.sidebarBg, display: "flex", flexDirection: "column",
  };

  return (
    <>
      {isMobile && visible && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      )}
      <div style={sidebarStyle}>
        <div style={{ padding: "20px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontFamily: "'EB Garamond','Garamond',serif", fontSize: 20, color: C.white, letterSpacing: "0.08em" }}>STYLD</div>
          {isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.sidebarMuted, cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
          )}
        </div>
        <div style={{ padding: "8px 12px 12px", flexShrink: 0 }}>
          <button onClick={onNewChat} className="fc-sidebar-new"
            style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.sidebarActive}`, background: "none", color: C.sidebarText, fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> New chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
          {ORDER.filter(g => groups[g]).map(group => (
            <div key={group}>
              <div style={{ fontSize: 10, color: C.sidebarMuted, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 8px 4px", fontWeight: 600 }}>{group}</div>
              {groups[group].map(conv => (
                <button key={conv.id} onClick={() => onSelect(conv.id)} className="fc-conv-item"
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8, border: "none",
                    background: conv.id === currentId ? C.sidebarActive : "none",
                    color: conv.id === currentId ? C.white : C.sidebarText,
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                    fontFamily: "inherit", display: "block",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: 1,
                  }}>
                  {conv.title || "New conversation"}
                </button>
              ))}
            </div>
          ))}
          {conversations.length === 0 && (
            <div style={{ padding: "24px 10px", color: C.sidebarMuted, fontSize: 12, textAlign: "center" }}>
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(value === opt ? "" : opt)}
          style={{ padding: "7px 16px", borderRadius: 100, border: `1px solid ${value === opt ? C.purple : C.border}`, background: value === opt ? C.purple : C.white, color: value === opt ? C.white : C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ProfilePanel({ profileForm, onChange, onSave, saving, onClose }) {
  const fields = [
    { label: "Name", key: "name", placeholder: "First name", type: "input" },
    { label: "Gender", key: "gender", options: ["Woman", "Man", "Non-binary", "Prefer not to say"], type: "pill" },
    { label: "Fit Preference", key: "fit_preference", options: ["Oversized", "Regular", "Slim"], type: "pill" },
    { label: "Budget Per Item", key: "budget", options: ["Under $50", "$50–150", "$150–300", "$300+"], type: "pill" },
    { label: "Favorite Brands", key: "favorite_brands", placeholder: "e.g. Zara, Nike, Aritzia…", type: "input" },
    { label: "Climate", key: "climate", options: ["Warm", "Mild", "Cold"], type: "pill" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div className="fc-panel" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 440, background: C.white, overflowY: "auto", padding: "32px 28px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Your Profile</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: C.muted, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {fields.map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 10 }}>{f.label}</div>
              {f.type === "input" ? (
                <input value={profileForm[f.key]} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`, background: C.surfaceHigh, fontSize: 13, color: C.text, borderRadius: 12, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
              ) : (
                <PillGroup options={f.options} value={profileForm[f.key]} onChange={v => onChange(f.key, v)} />
              )}
            </div>
          ))}
        </div>
        <button onClick={onSave} disabled={saving}
          style={{ width: "100%", padding: "15px", background: C.purple, color: C.white, border: "none", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 40, opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function ClosetPanel({ user, closet, setCloset, onClose }) {
  const [tagging, setTagging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setTagging(true);
    try {
      const base64 = await compressClosetImage(file);
      const res = await fetch("/api/tag-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64Image: base64, mimeType: "image/jpeg" }) });
      const { label, item_type } = await res.json();
      const { data } = await supabase.from("closet_items").insert({ user_id: user.id, image: base64, label: label || "Clothing item", item_type: item_type || "other" }).select().single();
      if (data) setCloset(prev => [data, ...prev]);
    } catch (err) { console.error(err); }
    finally { setTagging(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const deleteItem = async (id) => {
    await supabase.from("closet_items").delete().eq("id", id);
    setCloset(prev => prev.filter(i => i.id !== id));
  };

  const saveLabel = async (id) => {
    const label = editingLabel.trim(); if (!label) return;
    await supabase.from("closet_items").update({ label }).eq("id", id);
    setCloset(prev => prev.map(i => i.id === id ? { ...i, label } : i));
    setEditingId(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div className="fc-panel" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 440, background: C.white, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>My Closet</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: C.muted, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>Add photos of items you own — your stylist will reference them.</div>
          <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" style={{ display: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div onClick={() => !tagging && fileRef.current?.click()}
              style={{ aspectRatio: "1", border: `1px dashed ${C.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: tagging ? "default" : "pointer", background: C.surfaceHigh, gap: 6 }}>
              {tagging ? (
                <div style={{ width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
              ) : (
                <>
                  <div style={{ fontSize: 22, color: C.muted, lineHeight: 1 }}>+</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>Add</div>
                </>
              )}
            </div>
            {closet.map(item => (
              <div key={item.id} style={{ position: "relative" }}>
                <div style={{ aspectRatio: "1", overflow: "hidden", background: C.surfaceHigh, borderRadius: 12, marginBottom: 6 }}>
                  <img src={item.image} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                {editingId === item.id ? (
                  <input autoFocus value={editingLabel} onChange={e => setEditingLabel(e.target.value)}
                    onBlur={() => saveLabel(item.id)}
                    onKeyDown={e => { if (e.key === "Enter") saveLabel(item.id); if (e.key === "Escape") setEditingId(null); }}
                    style={{ width: "100%", fontSize: 10, color: C.text, border: "none", borderBottom: `1px solid ${C.purple}`, background: "transparent", outline: "none", fontFamily: "inherit", padding: "2px 0", boxSizing: "border-box" }} />
                ) : (
                  <div onClick={() => { setEditingId(item.id); setEditingLabel(item.label); }}
                    style={{ fontSize: 10, color: C.text, lineHeight: 1.4, cursor: "text", paddingRight: 4 }}>{item.label}</div>
                )}
                <button onClick={() => deleteItem(item.id)}
                  style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ))}
          </div>
          {closet.length === 0 && !tagging && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 12, color: C.muted }}>Tap + to add your first piece.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistPanel({ user, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("wishlist_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [user.id]);

  const remove = async (id) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div className="fc-panel" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 440, background: C.white, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Wishlist</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: C.muted, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
              <div style={{ width: 22, height: 22, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "fc-spin 0.9s linear infinite" }} />
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛍️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Your wishlist is empty</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>When your stylist recommends items, tap "+ wishlist" to save them here.</div>
            </div>
          ) : items.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.text }}>{item.name}</div>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(item.image_query || item.name)}&tbm=shop`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: C.purple, textDecoration: "none", fontWeight: 600, padding: "5px 12px", border: `1px solid ${C.purple}40`, borderRadius: 100, flexShrink: 0 }}>
                Shop
              </a>
              <button onClick={() => remove(item.id)}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 2 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function FitCheck({ user, onSignOut }) {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState([]);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [profileForm, setProfileForm] = useState(PROFILE_DEFAULTS);
  const [profileSaving, setProfileSaving] = useState(false);
  const [closet, setCloset] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (user) { loadConversations(); loadProfile(); loadCloset(); }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadConversations = async () => {
    const { data } = await supabase.from("conversations").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setConversations(data || []);
  };

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfileForm(data);
  };

  const loadCloset = async () => {
    const { data } = await supabase.from("closet_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCloset(data || []);
  };

  const selectConversation = async (convId) => {
    setCurrentConvId(convId);
    setSidebarOpen(false);
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages((data || []).map(m => ({
      role: m.role, content: m.content,
      hasImagePlaceholder: m.has_images, images: null,
    })));
    setAttachedImages([]);
    setInput("");
  };

  const startNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setAttachedImages([]);
    setInput("");
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleImageAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const compressed = await Promise.all(files.map(compressImage));
    setAttachedImages(prev => [...prev, ...compressed]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addToWishlist = async (name, imageQuery) => {
    if (!user) return;
    await supabase.from("wishlist_items").insert({ user_id: user.id, name, image_query: imageQuery });
  };

  const send = async () => {
    const text = input.trim();
    if (!text && attachedImages.length === 0) return;
    if (sending) return;

    const newMsg = { role: "user", content: text, images: attachedImages.length > 0 ? [...attachedImages] : null, hasImagePlaceholder: false };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInput("");
    setAttachedImages([]);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setSending(true);

    try {
      let convId = currentConvId;
      if (!convId) {
        const title = text.slice(0, 45) || (attachedImages.length > 0 ? "Outfit check" : "New chat");
        const { data } = await supabase.from("conversations").insert({ user_id: user.id, title }).select().single();
        convId = data.id;
        setCurrentConvId(convId);
        setConversations(prev => [data, ...prev]);
      }

      await supabase.from("messages").insert({
        conversation_id: convId, role: "user",
        content: text, has_images: !!(newMsg.images && newMsg.images.length > 0),
      });

      const apiMessages = updatedMessages.map(msg => {
        if (msg.images && msg.images.length > 0) {
          return {
            role: msg.role,
            content: [
              ...msg.images.map(img => ({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64.replace(/^data:[^;]+;base64,/, "") } })),
              ...(msg.content ? [{ type: "text", text: msg.content }] : []),
            ],
          };
        }
        return { role: msg.role, content: msg.content };
      });

      const profile = Object.values(profileForm).some(v => v) ? profileForm : null;
      const closetLabels = closet.map(i => i.label).filter(Boolean);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, profile, closetItems: closetLabels }),
      });
      const { reply } = await res.json();
      const replyText = reply || "Something went wrong — try again?";

      await supabase.from("messages").insert({ conversation_id: convId, role: "assistant", content: replyText, has_images: false });
      setMessages(prev => [...prev, { role: "assistant", content: replyText }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again?" }]);
    } finally {
      setSending(false);
    }
  };

  const headerBtnStyle = {
    background: "none", border: "none", fontSize: 11,
    letterSpacing: "0.15em", textTransform: "uppercase",
    color: C.muted, cursor: "pointer", padding: "6px 10px",
    borderRadius: 8, fontFamily: "inherit", transition: "background 0.15s",
  };

  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "'Inter','SF Pro Display',-apple-system,Helvetica,sans-serif", overflow: "hidden", background: C.bg }}>
      <style>{`
        @keyframes fc-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fc-panel  { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fc-bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes fc-fade   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fc-panel     { animation: fc-panel 0.28s ease forwards; }
        .fc-msg       { animation: fc-fade 0.25s ease forwards; }
        .fc-sidebar-new:hover { background: ${C.sidebarActive} !important; }
        .fc-conv-item:hover   { background: ${C.sidebarActive} !important; }
        .fc-header-btn:hover  { background: ${C.surfaceHigh} !important; }
        .fc-send:hover        { opacity: 0.85 !important; }
        .fc-attach:hover      { background: #EBEBEC !important; }
        .fc-starter:hover     { border-color: ${C.purple} !important; color: ${C.text} !important; }
        textarea.fc-input:focus { outline: none; }
        textarea.fc-input::placeholder { color: ${C.muted}; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #D4D4D8; border-radius: 4px; }
      `}</style>

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentId={currentConvId}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        visible={sidebarOpen}
      />

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: "12px 16px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} className="fc-header-btn"
              style={{ ...headerBtnStyle, fontSize: 20, padding: "4px 8px" }}>≡</button>
          )}
          {isMobile && (
            <div style={{ fontFamily: "'EB Garamond','Garamond',serif", fontSize: 18, letterSpacing: "0.08em", color: C.text }}>STYLD</div>
          )}
          <div style={{ flex: 1 }} />
          {(["Closet", "Wishlist", "Profile"]).map(label => (
            <button key={label} onClick={() => setPanel(label.toLowerCase())} className="fc-header-btn"
              style={headerBtnStyle}>{label}</button>
          ))}
          <button onClick={onSignOut} className="fc-header-btn"
            style={{ ...headerBtnStyle, color: C.border }}
            onMouseEnter={e => e.currentTarget.style.color = C.muted}
            onMouseLeave={e => e.currentTarget.style.color = C.border}>
            Sign Out
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", background: C.white }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 28, textAlign: "center" }}>
                <div>
                  <div style={{ fontFamily: "'EB Garamond','Garamond',serif", fontSize: 34, color: C.text, letterSpacing: "0.04em", marginBottom: 10 }}>Your Stylist</div>
                  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 320 }}>Send a photo of your outfit options and tell me what you're going for.</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 380 }}>
                  {STARTERS.map(s => (
                    <button key={s} className="fc-starter" onClick={() => setInput(s)}
                      style={{ padding: "9px 18px", borderRadius: 100, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className="fc-msg">
                    <ChatBubble message={msg} onAddWishlist={addToWishlist} />
                  </div>
                ))}
                {sending && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: "10px 16px 16px", background: C.white, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {/* Image previews */}
            {attachedImages.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {attachedImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: C.surfaceHigh, flexShrink: 0 }}>
                    <img src={img.base64} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {/* Input row */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" multiple style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} className="fc-attach"
                style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surfaceHigh, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "background 0.15s" }}>
                📎
              </button>
              <textarea
                ref={textareaRef}
                className="fc-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
                placeholder="Message your stylist…"
                rows={1}
                style={{
                  flex: 1, padding: "10px 16px", border: `1px solid ${C.border}`,
                  background: C.surfaceHigh, fontSize: 14, color: C.text,
                  borderRadius: 20, resize: "none", fontFamily: "inherit",
                  lineHeight: 1.5, maxHeight: 130, overflowY: "auto",
                  boxSizing: "border-box",
                }}
              />
              <button onClick={send} className="fc-send"
                disabled={sending || (!input.trim() && attachedImages.length === 0)}
                style={{
                  width: 40, height: 40, borderRadius: 12, background: C.purple,
                  border: "none", color: C.white, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0, transition: "opacity 0.2s",
                  opacity: (sending || (!input.trim() && attachedImages.length === 0)) ? 0.35 : 1,
                }}>↑</button>
            </div>
          </div>
        </div>
      </div>

      {/* Panels */}
      {panel === "profile" && (
        <ProfilePanel profileForm={profileForm} onChange={(k, v) => setProfileForm(p => ({ ...p, [k]: v }))} onSave={async () => { setProfileSaving(true); await supabase.from("profiles").upsert({ id: user.id, ...profileForm, updated_at: new Date().toISOString() }); setProfileSaving(false); setPanel(null); }} saving={profileSaving} onClose={() => setPanel(null)} />
      )}
      {panel === "closet" && (
        <ClosetPanel user={user} closet={closet} setCloset={setCloset} onClose={() => setPanel(null)} />
      )}
      {panel === "wishlist" && (
        <WishlistPanel user={user} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}
