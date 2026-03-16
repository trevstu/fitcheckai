import { useState, useEffect, useRef } from "react";

const ORANGE = "#E82A2A";
const ORANGE_DIM = "rgba(232,42,42,0.15)";
const ORANGE_BORDER = "rgba(232,42,42,0.4)";
const BG = "#0e0e0f";
const SIDEBAR_BG = "#141416";
const CARD_BG = "#1a1a1e";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#f0f0f0";
const TEXT_MUTED = "#888";
const TEXT_DIM = "#555";

const NAV = [
  { id: "Overview", icon: "⚡" },
  { id: "RSVP", icon: "✅" },
  { id: "Leaderboard", icon: "🏆" },
  { id: "Routes", icon: "🗺️" },
  { id: "History", icon: "📅" },
  { id: "Partnerships", icon: "🤝" },
  { id: "Events", icon: "🎉" },
  { id: "Races", icon: "🏁" },
  { id: "Announcements", icon: "📣" },
  { id: "Feed", icon: "💬" },
];

const ADMIN_PIN = "1234";

const DEFAULT_DATA = {
  members: [
    { name: "Trevor Stuart", runs: 8, streak: 8, badge: "Founder" },
    { name: "Sabrina Leiu", runs: 8, streak: 8, badge: "OG" },
    { name: "Member 3", runs: 6, streak: 4, badge: "" },
    { name: "Member 4", runs: 5, streak: 3, badge: "" },
    { name: "Member 5", runs: 5, streak: 2, badge: "" },
    { name: "Member 6", runs: 4, streak: 2, badge: "" },
    { name: "Member 7", runs: 3, streak: 1, badge: "" },
    { name: "Member 8", runs: 2, streak: 1, badge: "" },
  ],
  routes: [
    { name: "Brooklyn Bridge Loop", dist: "4.2 mi", diff: "Easy", notes: "Meet at Dumbo, cross bridge, loop back via the path." },
    { name: "Prospect Park Full", dist: "3.4 mi", diff: "Easy", notes: "Classic loop. Great for tempo runs." },
    { name: "Hudson River Greenway", dist: "6.0 mi", diff: "Moderate", notes: "North from Tribeca to 79th St. Flat and fast." },
    { name: "Williamsburg Waterfront", dist: "5.1 mi", diff: "Moderate", notes: "Along the East River with Manhattan views." },
    { name: "Central Park Reservoir", dist: "3.1 mi", diff: "Easy", notes: "Dirt path around the reservoir. Iconic NYC run." },
    { name: "Greenpoint to DUMBO", dist: "7.2 mi", diff: "Hard", notes: "Long run special. Multiple bridges, great views." },
  ],
  history: [
    { date: "Mar 11, 2025", route: "Brooklyn Bridge Loop", attendees: 22, notes: "Perfect weather, PR attempts all around." },
    { date: "Mar 4, 2025", route: "Prospect Park Full", attendees: 19, notes: "Rainy but the crew showed up." },
    { date: "Feb 25, 2025", route: "Hudson River Greenway", attendees: 26, notes: "Running Collection launch week energy." },
  ],
  partners: [
    { name: "Blue Bottle Coffee", category: "Coffee", perk: "20% off any drink", code: "STUESDAYS20", emoji: "☕" },
    { name: "Tracksmith", category: "Running Gear", perk: "15% off full-price items", code: "STU15", emoji: "👟" },
    { name: "Whoop", category: "Fitness Tech", perk: "1 month free membership", code: "STUESWHOOP", emoji: "⌚" },
    { name: "Smile + Juice", category: "Nutrition", perk: "Buy 3 get 1 free", code: "STUCLUB", emoji: "🥤" },
  ],
  events: [
    { date: "Mar 18, 2025", name: "Stuesdays Weekly Run", type: "Run", time: "7:00 AM", loc: "Dumbo, Brooklyn" },
    { date: "Mar 25, 2025", name: "Stuesdays Weekly Run", type: "Run", time: "7:00 AM", loc: "Prospect Park" },
    { date: "Apr 1, 2025", name: "Monthly Long Run", type: "Run", time: "6:30 AM", loc: "Hudson River Greenway" },
    { date: "Apr 5, 2025", name: "Community Brunch", type: "Social", time: "10:00 AM", loc: "Williamsburg, BK" },
  ],
  races: [
    { date: "Mar 23, 2025", name: "NYC Half Marathon", dist: "13.1 mi", loc: "Manhattan, NYC" },
    { date: "Apr 6, 2025", name: "Brooklyn Half", dist: "13.1 mi", loc: "Brooklyn, NYC" },
    { date: "May 18, 2025", name: "Brooklyn 5K Classic", dist: "3.1 mi", loc: "Prospect Park" },
    { date: "Nov 2, 2025", name: "TCS NYC Marathon", dist: "26.2 mi", loc: "NYC" },
  ],
  rsvps: ["Sabrina Leiu"],
  upcomingRun: { date: "Tuesday, March 18, 2025", time: "7:00 AM", route: "Brooklyn Bridge Loop", distance: "4.2 mi", meetup: "Dumbo Archway, Brooklyn" },
  announcements: [
    { id: 1, title: "Running Collection is live!", body: "The Saint Stu Running Collection just dropped. Rep the brand on your next Stuesdays run.", date: "Mar 1, 2025", pinned: true },
    { id: 2, title: "New partnership with Blue Bottle", body: "Stuesdays members now get 20% off at Blue Bottle Coffee. Use code STUESDAYS20.", date: "Mar 5, 2025", pinned: false },
  ],
  feed: [
    { id: 1, author: "Trevor Stuart", badge: "Founder", text: "First Stuesdays of March in the books. Brooklyn Bridge at sunrise is undefeated.", date: "Mar 11, 2025", likes: 14, photo: null },
    { id: 2, author: "Sabrina Leiu", badge: "OG", text: "Ran a personal best today — 4.2 miles at 8:12 pace. The crew energy makes all the difference.", date: "Mar 11, 2025", likes: 11, photo: null },
    { id: 3, author: "Member 3", badge: "", text: "Third week in a row. Building the habit one Tuesday at a time.", date: "Mar 4, 2025", likes: 8, photo: null },
  ],
  accounts: [],
  raceSignups: {},
  cheerSpots: {},
};

const StuLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="18" fill={ORANGE}/>
    <text x="50" y="72" textAnchor="middle" fontSize="62" fontWeight="bold" fill="white" fontFamily="Georgia, serif">S</text>
  </svg>
);

function Avatar({ name, size = 36 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1) * 17) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue},50%,30%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: `hsl(${hue},70%,80%)`, flexShrink: 0, border: `1.5px solid hsl(${hue},40%,40%)` }}>
      {initials}
    </div>
  );
}

function Badge({ text }) {
  const map = { Founder: [ORANGE_DIM, ORANGE], OG: ["rgba(139,92,246,0.2)", "#a78bfa"], Pacer: ["rgba(20,184,166,0.2)", "#2dd4bf"], Rising: ["rgba(234,179,8,0.2)", "#facc15"] };
  const [bg, fg] = map[text] || ["rgba(255,255,255,0.08)", "#aaa"];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, border: `1px solid ${fg}30`, letterSpacing: 0.3 }}>{text}</span>;
}

function DiffPill({ diff }) {
  const map = { Easy: ["rgba(34,197,94,0.15)", "#4ade80"], Moderate: ["rgba(234,179,8,0.15)", "#facc15"], Hard: ["rgba(239,68,68,0.15)", "#f87171"] };
  const [bg, fg] = map[diff] || ["#333", "#aaa"];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color: fg }}>{diff}</span>;
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${glow ? ORANGE_BORDER : CARD_BORDER}`, borderRadius: 16, padding: "1rem 1.25rem", boxShadow: glow ? `0 0 24px ${ORANGE_BORDER}` : "none", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: "1rem", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, style = {}, type = "text", autoComplete }) {
  return <input type={type} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ fontSize: 13, padding: "8px 12px", borderRadius: 10, border: `1px solid ${CARD_BORDER}`, background: "#111113", color: TEXT, width: "100%", boxSizing: "border-box", outline: "none", ...style }} />;
}

function Btn({ onClick, children, variant = "primary", style = {} }) {
  const styles = {
    primary: { background: ORANGE, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: TEXT_MUTED, border: `1px solid ${CARD_BORDER}` },
    danger: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
  };
  return <button onClick={onClick} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 600, ...styles[variant], ...style }}>{children}</button>;
}

function AdminModal({ section, data, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(data)));
  const update = (i, f, v) => { const a = [...local]; a[i] = { ...a[i], [f]: v }; setLocal(a); };
  const remove = i => setLocal(local.filter((_, idx) => idx !== i));
  const add = t => setLocal([...local, { ...t }]);
  const row = { display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: "1.5rem", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>Edit {section}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: TEXT_MUTED }}>×</button>
        </div>
        {section === "Members" && (<>{local.map((m, i) => (<div key={i} style={{ ...row, flexWrap: "wrap" }}><Input value={m.name} onChange={v => update(i,"name",v)} placeholder="Name" style={{ flex: 2, minWidth: 120 }} /><Input value={m.runs} onChange={v => update(i,"runs",+v)} placeholder="Runs" style={{ flex:"0 0 55px" }} /><Input value={m.streak} onChange={v => update(i,"streak",+v)} placeholder="Streak" style={{ flex:"0 0 55px" }} /><Input value={m.badge} onChange={v => update(i,"badge",v)} placeholder="Badge" style={{ flex: 1, minWidth: 80 }} /><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div>))}<Btn onClick={() => add({ name:"",runs:0,streak:0,badge:"" })} variant="secondary">+ Add member</Btn></>)}
        {section === "Routes" && (<>{local.map((r, i) => (<div key={i} style={{ marginBottom:10, padding:10, background:"#111113", borderRadius:10 }}><div style={row}><Input value={r.name} onChange={v => update(i,"name",v)} placeholder="Route name" style={{ flex:2 }} /><Input value={r.dist} onChange={v => update(i,"dist",v)} placeholder="Dist" style={{ flex:1 }} /><select value={r.diff} onChange={e => update(i,"diff",e.target.value)} style={{ fontSize:13, padding:"8px", borderRadius:8, border:`1px solid ${CARD_BORDER}`, background:"#111113", color:TEXT }}><option>Easy</option><option>Moderate</option><option>Hard</option></select><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div><Input value={r.notes} onChange={v => update(i,"notes",v)} placeholder="Notes" /></div>))}<Btn onClick={() => add({ name:"",dist:"",diff:"Easy",notes:"" })} variant="secondary">+ Add route</Btn></>)}
        {section === "Partners" && (<>{local.map((p, i) => (<div key={i} style={{ marginBottom:10, padding:10, background:"#111113", borderRadius:10 }}><div style={row}><Input value={p.name} onChange={v => update(i,"name",v)} placeholder="Brand" style={{ flex:2 }} /><Input value={p.category} onChange={v => update(i,"category",v)} placeholder="Category" style={{ flex:1 }} /><Input value={p.emoji} onChange={v => update(i,"emoji",v)} placeholder="Emoji" style={{ flex:"0 0 48px" }} /><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div><div style={row}><Input value={p.perk} onChange={v => update(i,"perk",v)} placeholder="Perk" style={{ flex:2 }} /><Input value={p.code} onChange={v => update(i,"code",v)} placeholder="Code" style={{ flex:1 }} /></div></div>))}<Btn onClick={() => add({ name:"",category:"",perk:"",code:"",emoji:"🤝" })} variant="secondary">+ Add partner</Btn></>)}
        {section === "Events" && (<>{local.map((e, i) => (<div key={i} style={{ marginBottom:10, padding:10, background:"#111113", borderRadius:10 }}><div style={row}><Input value={e.date} onChange={v => update(i,"date",v)} placeholder="Date" style={{ flex:1 }} /><Input value={e.time} onChange={v => update(i,"time",v)} placeholder="Time" style={{ flex:"0 0 88px" }} /><select value={e.type} onChange={ev => update(i,"type",ev.target.value)} style={{ fontSize:13, padding:"8px", borderRadius:8, border:`1px solid ${CARD_BORDER}`, background:"#111113", color:TEXT }}><option>Run</option><option>Social</option><option>Pop-Up</option></select><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div><div style={row}><Input value={e.name} onChange={v => update(i,"name",v)} placeholder="Event name" style={{ flex:2 }} /><Input value={e.loc} onChange={v => update(i,"loc",v)} placeholder="Location" style={{ flex:1 }} /></div></div>))}<Btn onClick={() => add({ date:"",name:"",type:"Run",time:"",loc:"" })} variant="secondary">+ Add event</Btn></>)}
        {section === "Races" && (<>{local.map((r, i) => (<div key={i} style={{ marginBottom:10, padding:10, background:"#111113", borderRadius:10 }}><div style={row}><Input value={r.date} onChange={v => update(i,"date",v)} placeholder="Date" style={{ flex:1 }} /><Input value={r.dist} onChange={v => update(i,"dist",v)} placeholder="Dist" style={{ flex:"0 0 80px" }} /><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div><div style={row}><Input value={r.name} onChange={v => update(i,"name",v)} placeholder="Race name" style={{ flex:2 }} /><Input value={r.loc} onChange={v => update(i,"loc",v)} placeholder="Location" style={{ flex:1 }} /></div></div>))}<Btn onClick={() => add({ date:"",name:"",dist:"",loc:"" })} variant="secondary">+ Add race</Btn></>)}
        {section === "History" && (<>{local.map((h, i) => (<div key={i} style={{ marginBottom:10, padding:10, background:"#111113", borderRadius:10 }}><div style={row}><Input value={h.date} onChange={v => update(i,"date",v)} placeholder="Date" style={{ flex:1 }} /><Input value={h.route} onChange={v => update(i,"route",v)} placeholder="Route" style={{ flex:2 }} /><Input value={h.attendees} onChange={v => update(i,"attendees",+v)} placeholder="#" style={{ flex:"0 0 48px" }} /><Btn onClick={() => remove(i)} variant="danger" style={{ padding:"7px 10px" }}>×</Btn></div><Input value={h.notes} onChange={v => update(i,"notes",v)} placeholder="Notes" /></div>))}<Btn onClick={() => add({ date:"",route:"",attendees:0,notes:"" })} variant="secondary">+ Add run</Btn></>)}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16, borderTop:`1px solid ${CARD_BORDER}`, paddingTop:12 }}>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          <Btn onClick={() => { onSave(local); onClose(); }}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode, onModeChange, accounts, onSuccess, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = () => {
    setErr("");
    if (mode === "register") {
      if (!name.trim()) { setErr("Please enter your name."); return; }
      if (!email.trim()) { setErr("Please enter your email."); return; }
      if (password.length < 4) { setErr("Password must be at least 4 characters."); return; }
      if (accounts.some(a => a.email.toLowerCase() === email.trim().toLowerCase())) {
        setErr("An account with that email already exists."); return;
      }
      const d = new Date();
      const ds = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const newUser = { id: Date.now(), name: name.trim(), email: email.trim().toLowerCase(), password, joinedDate: ds };
      onSuccess(newUser, [...accounts, newUser]);
    } else {
      if (!email.trim() || !password) { setErr("Please enter your email and password."); return; }
      const match = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password);
      if (!match) { setErr("Incorrect email or password."); return; }
      onSuccess(match, accounts);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: "1.75rem", width: "100%", maxWidth: 320 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StuLogo size={28} />
            <span style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{mode === "login" ? "Sign In" : "Create Account"}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: TEXT_MUTED }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <Input value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
          )}
          <Input value={email} onChange={setEmail} placeholder="Email" autoComplete="email" />
          <Input value={password} onChange={setPassword} placeholder="Password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} />
        </div>
        {err && <div style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{err}</div>}
        <Btn onClick={handleSubmit} style={{ width: "100%", marginTop: 14, padding: "10px", fontSize: 14 }}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </Btn>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: TEXT_MUTED }}>
          {mode === "login"
            ? <span>New here? <span onClick={() => { onModeChange("register"); setErr(""); }} style={{ color: ORANGE, cursor: "pointer", fontWeight: 600 }}>Create an account</span></span>
            : <span>Already have an account? <span onClick={() => { onModeChange("login"); setErr(""); }} style={{ color: ORANGE, cursor: "pointer", fontWeight: 600 }}>Sign in</span></span>
          }
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [likedPosts, setLikedPosts] = useState({});
  const [aTitle, setATitle] = useState(""); const [aBody, setABody] = useState(""); const [aPinned, setAPinned] = useState(false);
  const [feedText, setFeedText] = useState(""); const [feedPhoto, setFeedPhoto] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [cheerForm, setCheerForm] = useState({});
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const fileRef = useRef();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r5 = await window.storage.get("stuesdays_v5");
        if (r5?.value) { setData(JSON.parse(r5.value)); setLoaded(true); return; }
        const r4 = await window.storage.get("stuesdays_v4");
        if (r4?.value) {
          const old = JSON.parse(r4.value);
          const migrated = { ...DEFAULT_DATA, ...old, accounts: [], raceSignups: {}, cheerSpots: {} };
          setData(migrated);
          await window.storage.set("stuesdays_v5", JSON.stringify(migrated));
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const persist = async nd => {
    setData(nd);
    try { await window.storage.set("stuesdays_v5", JSON.stringify(nd)); setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000); } catch {}
  };

  const saveSection = (sec, arr) => {
    const k = { Members:"members", Routes:"routes", Partners:"partners", Events:"events", Races:"races", History:"history" };
    persist({ ...data, [k[sec]]: arr });
  };

  const handleAuthSuccess = (user, updatedAccounts) => {
    setCurrentUser({ id: user.id, name: user.name, email: user.email });
    persist({ ...data, accounts: updatedAccounts });
    setShowAuthModal(false);
  };

  const handleRaceSignup = (raceName) => {
    const current = data.raceSignups?.[raceName] || [];
    const isIn = current.includes(currentUser.name);
    const updated = isIn ? current.filter(n => n !== currentUser.name) : [...current, currentUser.name];
    persist({ ...data, raceSignups: { ...(data.raceSignups || {}), [raceName]: updated } });
  };

  const handleAddCheerSpot = (raceName) => {
    const form = cheerForm[raceName] || { mile: "", location: "" };
    if (!form.mile.trim() || !form.location.trim()) return;
    const spot = { name: currentUser.name, mile: form.mile.trim(), location: form.location.trim() };
    const existing = data.cheerSpots?.[raceName] || [];
    persist({ ...data, cheerSpots: { ...(data.cheerSpots || {}), [raceName]: [...existing, spot] } });
    setCheerForm(prev => ({ ...prev, [raceName]: { mile: "", location: "" } }));
  };

  const handleRemoveCheerSpot = (raceName, idx) => {
    const existing = [...(data.cheerSpots?.[raceName] || [])];
    existing.splice(idx, 1);
    persist({ ...data, cheerSpots: { ...(data.cheerSpots || {}), [raceName]: existing } });
  };

  const EditBtn = ({ section, arr }) => adminUnlocked ? (
    <button onClick={() => setEditSection({ section, arr })} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, border: `1px solid ${ORANGE_BORDER}`, background: ORANGE_DIM, color: ORANGE, cursor: "pointer", fontWeight: 600 }}>Edit</button>
  ) : null;

  const sorted = [...(data.announcements || [])].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const navigateTo = (id) => {
    setTab(id);
    if (isMobile) setSidebarOpen(false);
  };

  if (!loaded) return <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: 14 }}>Loading...</div>;

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: TEXT }}>
      {editSection && <AdminModal section={editSection.section} data={editSection.arr} onSave={arr => saveSection(editSection.section, arr)} onClose={() => setEditSection(null)} />}

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          accounts={data.accounts || []}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showPin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: "1.5rem", width: 300 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: TEXT }}>Enter admin PIN</div>
            <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinErr(false); }} onKeyDown={e => { if (e.key === "Enter") { if (pin === ADMIN_PIN) { setAdminUnlocked(true); setShowPin(false); setPin(""); } else setPinErr(true); }}} placeholder="PIN" style={{ width: "100%", boxSizing: "border-box", fontSize: 16, padding: "10px 12px", borderRadius: 10, border: `1px solid ${pinErr ? "#f87171" : CARD_BORDER}`, background: "#111113", color: TEXT, marginBottom: 6, outline: "none" }} />
            {pinErr && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>Incorrect PIN</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              <Btn onClick={() => { setShowPin(false); setPin(""); setPinErr(false); }} variant="secondary">Cancel</Btn>
              <Btn onClick={() => { if (pin === ADMIN_PIN) { setAdminUnlocked(true); setShowPin(false); setPin(""); } else setPinErr(true); }}>Unlock</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? "fixed" : "fixed",
        top: 0, left: 0, bottom: 0,
        width: 240,
        background: SIDEBAR_BG,
        borderRight: `1px solid ${CARD_BORDER}`,
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0",
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        overflowY: "auto",
      }}>
        <div style={{ padding: "0 1rem 1.25rem", borderBottom: `1px solid ${CARD_BORDER}`, marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StuLogo size={38} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: -0.3 }}>Stuesdays</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Run Club</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => navigateTo(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 1rem", background: tab === n.id ? ORANGE_DIM : "transparent", border: "none", borderLeft: tab === n.id ? `3px solid ${ORANGE}` : "3px solid transparent", color: tab === n.id ? ORANGE : TEXT_MUTED, cursor: "pointer", fontSize: 14, fontWeight: tab === n.id ? 700 : 400, textAlign: "left", transition: "all 0.1s" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span> {n.id}
            </button>
          ))}
        </div>
        <div style={{ padding: "1rem", borderTop: `1px solid ${CARD_BORDER}` }}>
          {saveMsg && <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 6, textAlign: "center" }}>{saveMsg}</div>}
          <div style={{ marginBottom: 8 }}>
            {currentUser ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Avatar name={currentUser.name} size={28} />
                  <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{currentUser.name}</span>
                </div>
                <button onClick={() => setCurrentUser(null)} style={{ width: "100%", fontSize: 12, padding: "6px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer" }}>Sign out</button>
              </div>
            ) : (
              <button onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} style={{ width: "100%", fontSize: 12, padding: "7px", borderRadius: 10, border: `1px solid ${CARD_BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer", fontWeight: 600 }}>👤 Sign In / Register</button>
            )}
          </div>
          {adminUnlocked
            ? <button onClick={() => setAdminUnlocked(false)} style={{ width: "100%", fontSize: 12, padding: "7px", borderRadius: 10, border: `1px solid ${CARD_BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer" }}>🔓 Lock admin</button>
            : <button onClick={() => setShowPin(true)} style={{ width: "100%", fontSize: 12, padding: "7px", borderRadius: 10, border: `1px solid ${ORANGE_BORDER}`, background: ORANGE_DIM, color: ORANGE, cursor: "pointer", fontWeight: 600 }}>⚙️ Admin</button>
          }
        </div>
      </div>

      {/* Top bar (always visible) */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 56,
        background: SIDEBAR_BG,
        borderBottom: `1px solid ${CARD_BORDER}`,
        display: "flex",
        alignItems: "center",
        padding: "0 1rem",
        gap: 12,
        zIndex: 30,
      }}>
        <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, padding: 6, borderRadius: 8 }}>
          <span style={{ display: "block", width: 20, height: 2, background: TEXT_MUTED, borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: TEXT_MUTED, borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: TEXT_MUTED, borderRadius: 2 }} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StuLogo size={28} />
          <span style={{ fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: -0.3 }}>Stuesdays</span>
        </div>
        {/* Right side: user avatar or sign in */}
        <div style={{ marginLeft: "auto" }}>
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={currentUser.name} size={28} />
              {!isMobile && <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{currentUser.name}</span>}
            </div>
          ) : (
            <button onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, border: `1px solid ${CARD_BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer", fontWeight: 600 }}>Sign In</button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{
        marginTop: 56,
        padding: isMobile ? "1rem" : "1.5rem 2rem",
        maxWidth: 760,
        width: "100%",
        boxSizing: "border-box",
      }}>

        {/* Page header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: TEXT, letterSpacing: -0.5 }}>{NAV.find(n => n.id === tab)?.icon} {tab}</div>
        </div>

        {/* OVERVIEW */}
        {tab === "Overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
              <StatCard label="Members" value={data.members.length} sub="Active community" />
              <StatCard label="Runs" value={data.history.length} sub="Since launch" />
              <StatCard label="Next run" value="Mar 18" sub={data.upcomingRun.route} />
              <StatCard label="RSVPs" value={data.rsvps.length} sub="This Tuesday" />
            </div>
            {sorted.filter(a => a.pinned).length > 0 && (
              <Card glow style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>📌 Pinned</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 4 }}>{sorted.find(a => a.pinned)?.title}</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>{sorted.find(a => a.pinned)?.body}</div>
              </Card>
            )}
            <Card style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>Next Stuesdays</div>
                <span style={{ fontSize: 11, color: ORANGE, background: ORANGE_DIM, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>Upcoming</span>
              </div>
              <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 2 }}>
                <span style={{ color: TEXT, fontWeight: 600 }}>{data.upcomingRun.date}</span> · {data.upcomingRun.time}<br />
                {data.upcomingRun.route} · {data.upcomingRun.distance}<br />
                {data.upcomingRun.meetup}
              </div>
            </Card>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>Top runners</div>
                <EditBtn section="Members" arr={data.members} />
              </div>
              {data.members.slice(0, 4).map((m, i) => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${CARD_BORDER}` : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ORANGE : TEXT_DIM, width: 20 }}>{i + 1}</span>
                  <Avatar name={m.name} size={32} />
                  <span style={{ flex: 1, fontSize: 14, color: TEXT }}>{m.name}</span>
                  {m.badge && <Badge text={m.badge} />}
                  <span style={{ fontSize: 13, color: TEXT_MUTED }}>{m.runs} runs</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* RSVP */}
        {tab === "RSVP" && (
          <div>
            <Card glow style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: TEXT }}>This Tuesday</div>
              <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 2 }}>
                <span style={{ color: ORANGE, fontWeight: 700 }}>{data.upcomingRun.date}</span> · {data.upcomingRun.time}<br />
                {data.upcomingRun.route} · {data.upcomingRun.distance}<br />
                {data.upcomingRun.meetup}
              </div>
            </Card>
            <Card>
              <a href="https://withforte.co/@stuesdays" target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Register with Forte</a>
            </Card>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === "Leaderboard" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: TEXT }}>All-time attendance</div>
              <EditBtn section="Members" arr={data.members} />
            </div>
            {[...data.members].sort((a, b) => b.runs - a.runs).map((m, i) => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < data.members.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#facc15" : i === 1 ? "#94a3b8" : i === 2 ? "#fb923c" : TEXT_DIM, width: 24 }}>{i + 1}</span>
                <Avatar name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: TEXT, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>🔥 {m.streak} week streak</div>
                </div>
                {m.badge && !isMobile && <Badge text={m.badge} />}
                <div style={{ textAlign: "right", minWidth: 40 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ORANGE }}>{m.runs}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>runs</div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* ROUTES */}
        {tab === "Routes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><EditBtn section="Routes" arr={data.routes} /></div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {data.routes.map(r => (
                <Card key={r.name}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: TEXT }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 12, color: TEXT_MUTED }}>{r.dist}</span><DiffPill diff={r.diff} /></div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>{r.notes}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === "History" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: TEXT }}>Run history</div>
              <EditBtn section="History" arr={data.history} />
            </div>
            {data.history.map((h, i) => (
              <div key={h.date + i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < data.history.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}>
                <div style={{ minWidth: 72, fontSize: 12, color: TEXT_MUTED, paddingTop: 2, flexShrink: 0 }}>{h.date}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{h.route}</div><div style={{ fontSize: 12, color: TEXT_MUTED }}>{h.notes}</div></div>
                <div style={{ textAlign: "right", minWidth: 40, flexShrink: 0 }}><div style={{ fontSize: 15, fontWeight: 800, color: ORANGE }}>{h.attendees}</div><div style={{ fontSize: 11, color: TEXT_DIM }}>showed</div></div>
              </div>
            ))}
          </Card>
        )}

        {/* PARTNERSHIPS */}
        {tab === "Partnerships" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Exclusive perks for Stuesdays members.</div>
              <EditBtn section="Partners" arr={data.partners} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {data.partners.map(p => (
                <Card key={p.name}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: ORANGE_DIM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.emoji}</div>
                    <div><div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{p.name}</div><div style={{ fontSize: 11, color: TEXT_MUTED }}>{p.category}</div></div>
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10 }}>{p.perk}</div>
                  <div style={{ background: "#111113", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, color: ORANGE, letterSpacing: 1.5, fontFamily: "monospace" }}>{p.code}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS */}
        {tab === "Events" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Upcoming runs, socials, and pop-ups.</div>
              <EditBtn section="Events" arr={data.events} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.events.map((e, idx) => (
                <Card key={e.name + idx} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ minWidth: 44, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{e.date.split(" ")[0]}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: ORANGE }}>{e.date.split(" ")[1]?.replace(",","")}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 2 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED }}>{e.time} · {e.loc}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: e.type === "Run" ? ORANGE_DIM : "rgba(139,92,246,0.15)", color: e.type === "Run" ? ORANGE : "#a78bfa", fontWeight: 600, flexShrink: 0 }}>{e.type}</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* RACES */}
        {tab === "Races" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Sign up and mark your cheer spots.</div>
              <EditBtn section="Races" arr={data.races} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.races.map((r, idx) => {
                const signups = data.raceSignups?.[r.name] || [];
                const cheerSpots = data.cheerSpots?.[r.name] || [];
                const isIn = currentUser && signups.includes(currentUser.name);
                const cf = cheerForm[r.name] || { mile: "", location: "" };
                return (
                  <Card key={r.name + idx}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: signups.length > 0 || cheerSpots.length > 0 ? 12 : 0 }}>
                      <div style={{ minWidth: 44, textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{r.date.split(" ")[0]}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: ORANGE }}>{r.date.split(" ")[1]?.replace(",","")}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 2 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>{r.dist} · {r.loc}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        {currentUser ? (
                          <button onClick={() => handleRaceSignup(r.name)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: isIn ? `1.5px solid ${ORANGE}` : `1px solid ${CARD_BORDER}`, background: isIn ? ORANGE_DIM : "transparent", color: isIn ? ORANGE : TEXT_MUTED, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {isIn ? "I'm in ✓" : "I'm running this"}
                          </button>
                        ) : (
                          <span onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: `1px solid ${CARD_BORDER}`, color: TEXT_DIM, cursor: "pointer", whiteSpace: "nowrap" }}>Sign in to join</span>
                        )}
                        <span style={{ fontSize: 11, color: TEXT_DIM }}>{signups.length} going</span>
                      </div>
                    </div>

                    {signups.length > 0 && (
                      <div style={{ marginBottom: 12, paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Running</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {signups.map(name => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: 5, background: "#111113", border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: "3px 10px 3px 5px" }}>
                              <Avatar name={name} size={20} />
                              <span style={{ fontSize: 12, color: TEXT_MUTED }}>{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Cheer Spots {cheerSpots.length > 0 && <span style={{ color: TEXT_DIM, fontWeight: 400 }}>· {cheerSpots.length}</span>}
                      </div>
                      {cheerSpots.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                          {cheerSpots.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_MUTED, flexWrap: "wrap" }}>
                              <Avatar name={s.name} size={22} />
                              <span style={{ color: TEXT, fontWeight: 600 }}>{s.name}</span>
                              <span style={{ color: TEXT_DIM }}>Mile {s.mile} — {s.location}</span>
                              {adminUnlocked && (
                                <span onClick={() => handleRemoveCheerSpot(r.name, i)} style={{ fontSize: 11, color: "#f87171", cursor: "pointer" }}>×</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {currentUser ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                          <input
                            value={cf.mile}
                            onChange={e => setCheerForm(prev => ({ ...prev, [r.name]: { ...cf, mile: e.target.value } }))}
                            placeholder="Mile"
                            style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: "#111113", color: TEXT, width: 60, outline: "none", flexShrink: 0 }}
                          />
                          <input
                            value={cf.location}
                            onChange={e => setCheerForm(prev => ({ ...prev, [r.name]: { ...cf, location: e.target.value } }))}
                            placeholder="e.g. Lafayette & Flatbush"
                            style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: "#111113", color: TEXT, flex: 1, minWidth: isMobile ? "100%" : 0, outline: "none" }}
                          />
                          <button onClick={() => handleAddCheerSpot(r.name)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, background: ORANGE, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Add</button>
                        </div>
                      ) : (
                        <span onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} style={{ fontSize: 12, color: TEXT_DIM, cursor: "pointer" }}>Sign in to add a cheer spot</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === "Announcements" && (
          <div>
            {adminUnlocked && (
              <Card glow style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE, marginBottom: 10 }}>Post announcement</div>
                <Input value={aTitle} onChange={setATitle} placeholder="Title" style={{ marginBottom: 8 }} />
                <textarea value={aBody} onChange={e => setABody(e.target.value)} placeholder="Write your announcement..." rows={3} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 12px", borderRadius: 10, border: `1px solid ${CARD_BORDER}`, background: "#111113", color: TEXT, resize: "vertical", fontFamily: "inherit", marginBottom: 8, outline: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: TEXT_MUTED, cursor: "pointer" }}><input type="checkbox" checked={aPinned} onChange={e => setAPinned(e.target.checked)} /> Pin to top</label>
                  <Btn onClick={() => { if (!aTitle.trim() || !aBody.trim()) return; const d = new Date(); const ds = d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); persist({ ...data, announcements: [{ id: Date.now(), title: aTitle.trim(), body: aBody.trim(), date: ds, pinned: aPinned }, ...data.announcements] }); setATitle(""); setABody(""); setAPinned(false); }}>Post</Btn>
                </div>
              </Card>
            )}
            {sorted.length === 0 && <Card><div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 13, padding: "1.5rem 0" }}>No announcements yet.</div></Card>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sorted.map(a => (
                <Card key={a.id} style={{ borderLeft: a.pinned ? `3px solid ${ORANGE}` : `1px solid ${CARD_BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>{a.pinned && <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>📌 Pinned</div>}<div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{a.title}</div></div>
                    {adminUnlocked && <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => persist({ ...data, announcements: data.announcements.map(x => x.id === a.id ? { ...x, pinned: !x.pinned } : x) })} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${ORANGE_BORDER}`, background: ORANGE_DIM, color: ORANGE, cursor: "pointer" }}>{a.pinned ? "Unpin" : "Pin"}</button>
                      <button onClick={() => persist({ ...data, announcements: data.announcements.filter(x => x.id !== a.id) })} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer" }}>Delete</button>
                    </div>}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6 }}>{a.body}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 8 }}>{a.date}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FEED */}
        {tab === "Feed" && (
          <div>
            <Card style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 10 }}>Share with the crew</div>
              {currentUser ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Avatar name={currentUser.name} size={28} />
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{currentUser.name}</span>
                  </div>
                  <textarea value={feedText} onChange={e => setFeedText(e.target.value)} placeholder="How was the run? Share a moment..." rows={3} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 12px", borderRadius: 10, border: `1px solid ${CARD_BORDER}`, background: "#111113", color: TEXT, resize: "vertical", fontFamily: "inherit", marginBottom: 8, outline: "none" }} />
                  {feedPhoto && (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <img src={feedPhoto} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10 }} />
                      <button onClick={() => setFeedPhoto(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 13 }}>×</button>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => fileRef.current?.click()} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: "transparent", color: TEXT_MUTED, cursor: "pointer" }}>📷 Photo</button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFeedPhoto(ev.target.result); r.readAsDataURL(f); }} style={{ display: "none" }} />
                    <Btn onClick={() => { if (!feedText.trim()) return; const d = new Date(); const ds = d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); const m = data.members.find(x => x.name.toLowerCase() === currentUser.name.toLowerCase()); persist({ ...data, feed: [{ id: Date.now(), author: currentUser.name, badge: m?.badge || "", text: feedText.trim(), date: ds, likes: 0, photo: feedPhoto }, ...data.feed] }); setFeedText(""); setFeedPhoto(null); }}>Post</Btn>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: TEXT_DIM }}>
                  <span onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} style={{ color: ORANGE, cursor: "pointer", fontWeight: 600 }}>Sign in</span> to post to the feed.
                </div>
              )}
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.feed.map(post => (
                <Card key={post.id}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <Avatar name={post.author} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{post.author}</span>{post.badge && <Badge text={post.badge} />}</div>
                      <div style={{ fontSize: 11, color: TEXT_DIM }}>{post.date}</div>
                    </div>
                    {adminUnlocked && <button onClick={() => persist({ ...data, feed: data.feed.filter(p => p.id !== post.id) })} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", flexShrink: 0 }}>Delete</button>}
                  </div>
                  <div style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: post.photo ? 10 : 0 }}>{post.text}</div>
                  {post.photo && <img src={post.photo} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
                    <button onClick={() => setLikedPosts(p => ({ ...p, [post.id]: !p[post.id] }))} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 20, border: likedPosts[post.id] ? `1px solid ${ORANGE_BORDER}` : `1px solid ${CARD_BORDER}`, background: likedPosts[post.id] ? ORANGE_DIM : "transparent", color: likedPosts[post.id] ? ORANGE : TEXT_MUTED, cursor: "pointer", fontWeight: 600 }}>
                      {likedPosts[post.id] ? "❤️" : "🤍"} {post.likes + (likedPosts[post.id] ? 1 : 0)}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
