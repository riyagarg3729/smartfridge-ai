import { useState, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─── ANTHROPIC API CALL ──────────────────────────────────────────────────────
async function analyzeImageWithClaude(base64Image, mediaType) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image }
          },
          {
            type: "text",
            text: `Analyze this fridge image and identify all visible food items. Return ONLY a JSON object (no markdown, no explanation):
{"items":[{"name":"Milk","expiry_days":2,"category":"Dairy","quantity":"1 carton"},{"name":"Spinach","expiry_days":3,"category":"Vegetables","quantity":"1 bag"}],"recipes":[{"name":"Spinach Smoothie","ingredients":["Milk","Spinach"],"time":"5 mins","difficulty":"Easy","emoji":"🥤"},{"name":"Scrambled Eggs","ingredients":["Eggs"],"time":"8 mins","difficulty":"Easy","emoji":"🍳"}],"waste_score":68,"suggestions":"Your milk and spinach expire soon — make a green smoothie today to use both!"}
Include 4-7 items, 3-4 recipes. waste_score is 0-100 (100=perfectly fresh). Add emoji to each recipe.`
          }
        ]
      }]
    })
  });
  const data = await response.json();
  const text = data.content[0].text;
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_SCAN = {
  items: [
    { name: "Whole Milk", expiry_days: 1, category: "Dairy", quantity: "1 carton" },
    { name: "Baby Spinach", expiry_days: 2, category: "Vegetables", quantity: "1 bag" },
    { name: "Cheddar Cheese", expiry_days: 8, category: "Dairy", quantity: "200g" },
    { name: "Free Range Eggs", expiry_days: 14, category: "Proteins", quantity: "6 pieces" },
    { name: "Carrots", expiry_days: 10, category: "Vegetables", quantity: "4 pieces" },
    { name: "Greek Yogurt", expiry_days: 4, category: "Dairy", quantity: "500g" },
  ],
  recipes: [
    { name: "Spinach & Cheese Omelette", ingredients: ["Eggs", "Spinach", "Cheese"], time: "10 mins", difficulty: "Easy", emoji: "🍳" },
    { name: "Green Milk Smoothie", ingredients: ["Milk", "Spinach", "Yogurt"], time: "5 mins", difficulty: "Easy", emoji: "🥤" },
    { name: "Carrot & Egg Fried Rice", ingredients: ["Eggs", "Carrots"], time: "20 mins", difficulty: "Medium", emoji: "🍚" },
    { name: "Yogurt Carrot Dip", ingredients: ["Yogurt", "Carrots"], time: "5 mins", difficulty: "Easy", emoji: "🥕" },
  ],
  waste_score: 62,
  suggestions: "⚠️ Your milk expires tomorrow! Use it in a smoothie with spinach right away. Spinach also needs to be used within 2 days — perfect for a quick omelette."
};

const MOCK_HISTORY = [
  { scan_id: "1", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), items: MOCK_SCAN.items.slice(0, 4), waste_score: 75, recipes: MOCK_SCAN.recipes.slice(0, 2) },
  { scan_id: "2", timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), items: MOCK_SCAN.items.slice(0, 3), waste_score: 55, recipes: MOCK_SCAN.recipes.slice(0, 2) },
  { scan_id: "3", timestamp: new Date(Date.now() - 86400000 * 9).toISOString(), items: MOCK_SCAN.items.slice(2, 5), waste_score: 88, recipes: MOCK_SCAN.recipes.slice(1, 3) },
];

const CHART_DATA = [
  { week: "Week 1", saved: 3, wasted: 2 },
  { week: "Week 2", saved: 5, wasted: 1 },
  { week: "Week 3", saved: 4, wasted: 3 },
  { week: "Week 4", saved: 7, wasted: 0 },
  { week: "Week 5", saved: 6, wasted: 1 },
  { week: "Week 6", saved: 9, wasted: 0 },
];

const TREND_DATA = [
  { day: "Mon", score: 55 }, { day: "Tue", score: 62 }, { day: "Wed", score: 70 },
  { day: "Thu", score: 58 }, { day: "Fri", score: 75 }, { day: "Sat", score: 80 }, { day: "Sun", score: 72 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function expiryColor(days, dark) {
  if (days <= 2) return { bg: dark ? "bg-red-900/40" : "bg-red-50", border: "border-red-400", text: "text-red-400", badge: "bg-red-500", label: "Expires Soon!" };
  if (days <= 5) return { bg: dark ? "bg-yellow-900/40" : "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-400", badge: "bg-yellow-500", label: "Use This Week" };
  return { bg: dark ? "bg-emerald-900/40" : "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-400", badge: "bg-emerald-500", label: "Fresh" };
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function GlassCard({ children, className = "", dark, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
        dark
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-white/70 border-white/60 hover:bg-white/90"
      } ${onClick ? "cursor-pointer" : ""} shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-teal-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-emerald-400 text-lg">🤖 AI is analyzing your fridge...</p>
        <p className="text-sm text-gray-400 mt-1">Detecting items & estimating freshness</p>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────
function Landing({ onLogin, dark, toggleDark }) {
  const features = [
    { icon: "📷", title: "Snap & Detect", desc: "Upload a fridge photo and AI identifies every item in seconds" },
    { icon: "⏰", title: "Expiry Tracking", desc: "Color-coded freshness indicators keep you ahead of waste" },
    { icon: "🍽️", title: "Smart Recipes", desc: "Get personalized recipes using your near-expiry ingredients" },
    { icon: "📊", title: "Waste Analytics", desc: "Track your food-saving progress with beautiful charts" },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-950" : "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50"}`}>
      {/* Nav */}
      <nav className={`flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b sticky top-0 z-40 ${dark ? "bg-gray-950/80 border-white/10" : "bg-white/60 border-white/40"}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥦</span>
          <span className={`font-bold text-xl ${dark ? "text-white" : "text-gray-800"}`}>Fridge<span className="text-emerald-500">Watcher</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark} className={`p-2 rounded-lg transition ${dark ? "bg-white/10 hover:bg-white/20 text-yellow-300" : "bg-black/5 hover:bg-black/10 text-gray-600"}`}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button onClick={onLogin} className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-emerald-500/30">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI-Powered Food Intelligence
        </div>
        <h1 className={`text-5xl md:text-7xl font-black mb-6 leading-tight ${dark ? "text-white" : "text-gray-900"}`}>
          Fridge<br /><span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Waste Watcher</span>
        </h1>
        <p className={`text-xl md:text-2xl mb-10 max-w-2xl mx-auto font-light ${dark ? "text-gray-300" : "text-gray-600"}`}>
          From <span className="text-red-400 font-semibold">Waste</span> to <span className="text-emerald-500 font-semibold">Value</span> using AI — upload your fridge photo and never throw food away again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onLogin} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all">
            🚀 Start Saving Food
          </button>
          <button onClick={onLogin} className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 border ${dark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-200 text-gray-700"}`}>
            📖 See Demo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
          {[["1.3B", "Tons wasted/year"], ["40%", "Of food is wasted"], ["$1K+", "Saved per family"]].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className={`text-3xl font-black ${dark ? "text-white" : "text-gray-900"}`}>{num}</div>
              <div className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className={`text-3xl font-bold text-center mb-12 ${dark ? "text-white" : "text-gray-800"}`}>How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <GlassCard key={i} dark={dark} className="p-6 text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className={`font-bold text-lg mb-2 ${dark ? "text-white" : "text-gray-800"}`}>{f.title}</h3>
              <p className={`text-sm leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthPage({ mode, setMode, onAuth, dark }) {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) return setError("Please fill all fields");
    if (mode === "signup" && !form.name) return setError("Name is required");
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // Mock auth — in production connect to backend
    onAuth({ id: "demo-user", email: form.email, name: form.name || form.email.split("@")[0] });
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${dark ? "bg-gray-950" : "bg-gradient-to-br from-emerald-50 to-teal-100"}`}>
      <GlassCard dark={dark} className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🥦</div>
          <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-gray-900"}`}>
            {mode === "login" ? "Welcome back!" : "Join FridgeWatcher"}
          </h2>
          <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {mode === "login" ? "Sign in to your account" : "Start saving food today"}
          </p>
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Full Name</label>
              <input
                type="text" placeholder="Jane Smith"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`}
              />
            </div>
          )}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Email</label>
            <input
              type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Password</label>
            <input
              type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"}`}
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 shadow-lg shadow-emerald-500/30"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p className={`text-center text-sm mt-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {mode === "login" ? "Don't have an account? " : "Already have one? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-emerald-500 font-semibold hover:underline">
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>

        <div className={`mt-4 p-3 rounded-xl text-xs text-center ${dark ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-400"}`}>
          💡 Demo mode: any credentials work!
        </div>
      </GlassCard>
    </div>
  );
}

// ─── UPLOAD ZONE ──────────────────────────────────────────────────────────────
function UploadZone({ onAnalyze, dark, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith("image/")) return setError("Please upload a valid image file");
    setError("");
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return setError("Please select a fridge image first");
    setError("");
    try {
      const b64 = await fileToBase64(file);
      await onAnalyze(b64, file.type, file);
    } catch {
      setError("Failed to process image. Using demo data.");
      await onAnalyze(null, null, null);
    }
  };

  const useDemoData = () => onAnalyze(null, null, null);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
          dragOver
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
            : dark
            ? "border-white/20 bg-white/5 hover:border-emerald-500/60 hover:bg-white/10"
            : "border-gray-300 bg-white/50 hover:border-emerald-400 hover:bg-emerald-50/50"
        } ${!preview ? "cursor-pointer" : ""}`}
        style={{ minHeight: 220 }}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Fridge preview" className="w-full object-cover rounded-3xl" style={{ maxHeight: 320 }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={e => { e.stopPropagation(); setPreview(null); setFile(null); }}
                className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur text-white text-sm font-medium hover:bg-white/30 transition"
              >
                🔄 Change
              </button>
              <button
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur text-white text-sm font-medium hover:bg-white/30 transition"
              >
                📁 Browse
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-6xl mb-4 select-none">{dragOver ? "📥" : "📸"}</div>
            <p className={`font-bold text-lg mb-1 ${dark ? "text-white" : "text-gray-700"}`}>
              {dragOver ? "Drop it here!" : "Upload Fridge Photo"}
            </p>
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Drag & drop or click to browse</p>
            <p className={`text-xs mt-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>JPG, PNG, WEBP up to 10MB</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-emerald-500/30"
        >
          {loading ? "🤖 Analyzing..." : "🔍 Analyze My Fridge"}
        </button>
        <button
          onClick={useDemoData}
          disabled={loading}
          className={`px-5 py-4 rounded-2xl font-bold text-sm transition border ${dark ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          title="Use sample data"
        >
          🧪 Demo
        </button>
      </div>
    </div>
  );
}

// ─── FOOD ITEMS GRID ──────────────────────────────────────────────────────────
function FoodItemsGrid({ items, dark }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, i) => {
        const c = expiryColor(item.expiry_days, dark);
        return (
          <div
            key={i}
            className={`rounded-2xl border p-4 transition-all hover:scale-[1.02] ${c.bg} ${c.border} border`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className={`font-bold text-base ${dark ? "text-white" : "text-gray-800"}`}>{item.name}</p>
                <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{item.quantity} · {item.category}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg font-bold text-white ${c.badge}`}>
                {item.expiry_days}d
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-200"}`}>
                <div
                  className={`h-full rounded-full ${c.badge}`}
                  style={{ width: `${Math.min(100, (item.expiry_days / 14) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${c.text}`}>{c.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RECIPE CARDS ─────────────────────────────────────────────────────────────
function RecipeCards({ recipes, dark }) {
  const colors = [
    "from-orange-500/20 to-red-500/10",
    "from-emerald-500/20 to-teal-500/10",
    "from-purple-500/20 to-pink-500/10",
    "from-blue-500/20 to-cyan-500/10",
  ];
  const diffColor = { Easy: "text-emerald-400", Medium: "text-yellow-400", Hard: "text-red-400" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {recipes.map((r, i) => (
        <GlassCard key={i} dark={dark} className={`p-5 bg-gradient-to-br ${colors[i % colors.length]} border`}>
          <div className="flex items-start gap-4">
            <div className={`text-4xl p-3 rounded-2xl ${dark ? "bg-white/10" : "bg-white/80"}`}>
              {r.emoji || "🍽️"}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-base leading-tight ${dark ? "text-white" : "text-gray-800"}`}>{r.name}</h4>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>⏱ {r.time}</span>
                <span className={`text-xs font-semibold ${diffColor[r.difficulty] || "text-gray-400"}`}>{r.difficulty}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {r.ingredients.slice(0, 3).map((ing, j) => (
                  <span key={j} className={`text-xs px-2 py-0.5 rounded-lg ${dark ? "bg-white/10 text-gray-300" : "bg-white/60 text-gray-600"}`}>
                    {ing}
                  </span>
                ))}
                {r.ingredients.length > 3 && (
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${dark ? "bg-white/10 text-gray-400" : "bg-white/60 text-gray-500"}`}>
                    +{r.ingredients.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── ANALYTICS CHARTS ─────────────────────────────────────────────────────────
function AnalyticsSection({ dark }) {
  return (
    <div className="space-y-6">
      <GlassCard dark={dark} className="p-6">
        <h3 className={`font-bold text-lg mb-1 ${dark ? "text-white" : "text-gray-800"}`}>🥗 Food Saved vs Wasted</h3>
        <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>Weekly comparison (items)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#ffffff10" : "#e5e7eb"} />
            <XAxis dataKey="week" tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: dark ? "#1f2937" : "#fff", border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
              labelStyle={{ color: dark ? "#fff" : "#111" }}
            />
            <Bar dataKey="saved" fill="#10b981" radius={[6, 6, 0, 0]} name="Saved" />
            <Bar dataKey="wasted" fill="#f87171" radius={[6, 6, 0, 0]} name="Wasted" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard dark={dark} className="p-6">
        <h3 className={`font-bold text-lg mb-1 ${dark ? "text-white" : "text-gray-800"}`}>📈 Freshness Score Trend</h3>
        <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>Daily fridge health score this week</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={TREND_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#ffffff10" : "#e5e7eb"} />
            <XAxis dataKey="day" tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: dark ? "#9ca3af" : "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: dark ? "#1f2937" : "#fff", border: "none", borderRadius: 12 }}
              labelStyle={{ color: dark ? "#fff" : "#111" }}
            />
            <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", r: 4 }} name="Freshness" />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function HistorySection({ history, dark }) {
  if (!history.length) {
    return (
      <GlassCard dark={dark} className="p-12 text-center">
        <p className="text-4xl mb-4">📂</p>
        <p className={`font-bold ${dark ? "text-white" : "text-gray-700"}`}>No scan history yet</p>
        <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>Upload a fridge photo to get started!</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((scan, i) => {
        const expiring = scan.items.filter(it => it.expiry_days <= 2).length;
        const date = new Date(scan.timestamp);
        return (
          <GlassCard key={i} dark={dark} className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🧊</span>
                  <span className={`font-bold ${dark ? "text-white" : "text-gray-800"}`}>
                    Scan #{history.length - i}
                  </span>
                  {expiring > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                      {expiring} expiring!
                    </span>
                  )}
                </div>
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {scan.items.length} items detected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className={`text-2xl font-black ${scan.waste_score >= 70 ? "text-emerald-400" : scan.waste_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {scan.waste_score}
                  </div>
                  <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Score</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {scan.items.slice(0, 5).map((item, j) => {
                const c = expiryColor(item.expiry_days, dark);
                return (
                  <span key={j} className={`text-xs px-2 py-1 rounded-lg border ${c.bg} ${c.border} ${c.text} font-medium`}>
                    {item.name}
                  </span>
                );
              })}
              {scan.items.length > 5 && (
                <span className={`text-xs px-2 py-1 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                  +{scan.items.length - 5} more
                </span>
              )}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout, dark, toggleDark }) {
  const [activeTab, setActiveTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAnalyze = async (b64, mediaType, file) => {
    setLoading(true);
    setScanResult(null);
    try {
      let result = null;
      if (b64) {
        result = await analyzeImageWithClaude(b64, mediaType || "image/jpeg");
      }
      if (!result) result = MOCK_SCAN;

      setScanResult(result);
      setHistory(prev => [{
        scan_id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        items: result.items,
        waste_score: result.waste_score,
        recipes: result.recipes
      }, ...prev]);

      const urgent = result.items.filter(i => i.expiry_days <= 2);
      if (urgent.length) {
        showNotif(`⚠️ ${urgent.length} item(s) expire within 2 days!`, "warning");
      } else {
        showNotif("✅ Fridge analyzed successfully!");
      }
      setActiveTab("results");
    } catch {
      showNotif("❌ Analysis failed. Showing demo data.", "error");
      setScanResult(MOCK_SCAN);
      setActiveTab("results");
    }
    setLoading(false);
  };

  const downloadReport = () => {
    if (!scanResult) return;
    const lines = [
      "FRIDGE WASTE WATCHER - SCAN REPORT",
      "=" .repeat(40),
      `Date: ${new Date().toLocaleString()}`,
      `Freshness Score: ${scanResult.waste_score}/100`,
      "",
      "DETECTED ITEMS:",
      ...scanResult.items.map(i => `  • ${i.name} — expires in ${i.expiry_days} days (${i.quantity})`),
      "",
      "RECIPE SUGGESTIONS:",
      ...scanResult.recipes.map(r => `  • ${r.name} (${r.time}, ${r.difficulty})`),
      "",
      "AI SUGGESTIONS:",
      scanResult.suggestions || "No suggestions available."
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fridge-report-${Date.now()}.txt`;
    a.click();
    showNotif("📄 Report downloaded!");
  };

  const tabs = [
    { id: "scan", label: "Scan", icon: "📷" },
    { id: "results", label: "Results", icon: "🔍", disabled: !scanResult },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "history", label: "History", icon: "📂" },
  ];

  const urgentCount = scanResult ? scanResult.items.filter(i => i.expiry_days <= 2).length : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-950" : "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50"}`}>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all animate-bounce ${
          notification.type === "error" ? "bg-red-500" : notification.type === "warning" ? "bg-yellow-500" : "bg-emerald-500"
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-sm border-b ${dark ? "bg-gray-950/80 border-white/10" : "bg-white/60 border-white/40"}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥦</span>
            <div>
              <span className={`font-black text-xl ${dark ? "text-white" : "text-gray-900"}`}>
                Fridge<span className="text-emerald-500">Watcher</span>
              </span>
              <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Welcome, {user.name}! 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <div className="relative">
                <span className="w-2 h-2 bg-red-500 rounded-full absolute -top-0.5 -right-0.5 animate-ping" />
                <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  🚨 {urgentCount} expiring
                </span>
              </div>
            )}
            {scanResult && (
              <button onClick={downloadReport} className={`p-2 rounded-xl transition text-sm ${dark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-black/5 hover:bg-black/10 text-gray-600"}`} title="Download report">
                📥
              </button>
            )}
            <button onClick={toggleDark} className={`p-2 rounded-xl transition ${dark ? "bg-white/5 hover:bg-white/10 text-yellow-300" : "bg-black/5 hover:bg-black/10 text-gray-600"}`}>
              {dark ? "☀️" : "🌙"}
            </button>
            <button onClick={onLogout} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${dark ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-black/5 hover:bg-black/10 text-gray-600"}`}>
              Sign out
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "🔍", label: "Scans", value: history.length },
              { icon: "🥗", label: "Items", value: history.reduce((a, s) => a + s.items.length, 0) },
              { icon: "✅", label: "Freshness", value: scanResult ? `${scanResult.waste_score}%` : "—" },
              { icon: "🍽️", label: "Recipes", value: scanResult ? scanResult.recipes.length : "—" },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-center ${dark ? "bg-white/5" : "bg-white/60"}`}>
                <p className="text-lg">{s.icon}</p>
                <p className={`text-sm font-black ${dark ? "text-white" : "text-gray-800"}`}>{s.value}</p>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className={`flex gap-1 p-1 rounded-2xl mb-6 w-fit ${dark ? "bg-white/5" : "bg-white/60"} backdrop-blur-sm border ${dark ? "border-white/10" : "border-white/40"}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : tab.disabled
                  ? dark ? "text-gray-600 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                  : dark ? "text-gray-300 hover:bg-white/10" : "text-gray-600 hover:bg-white/60"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="pb-20">
          {activeTab === "scan" && (
            <div className="max-w-2xl mx-auto">
              <GlassCard dark={dark} className="p-6">
                <h2 className={`font-black text-2xl mb-1 ${dark ? "text-white" : "text-gray-800"}`}>🔍 Analyze Your Fridge</h2>
                <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>Upload a photo and AI will detect all food items, estimate expiry, and suggest recipes</p>
                {loading ? <Spinner /> : <UploadZone onAnalyze={handleAnalyze} dark={dark} loading={loading} />}
              </GlassCard>

              <GlassCard dark={dark} className="p-5 mt-4">
                <h3 className={`font-bold mb-3 ${dark ? "text-white" : "text-gray-700"}`}>💡 Tips for Best Results</h3>
                <ul className="space-y-2">
                  {["Take photo with fridge door fully open", "Ensure good lighting — natural light works best", "Include all shelves in the frame", "JPG or PNG format recommended"].map((tip, i) => (
                    <li key={i} className={`flex items-center gap-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      <span className="text-emerald-500">✓</span> {tip}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          )}

          {activeTab === "results" && scanResult && (
            <div className="space-y-6">
              {/* AI Suggestion Banner */}
              {scanResult.suggestions && (
                <GlassCard dark={dark} className="p-5 border-l-4 border-l-emerald-500">
                  <div className="flex gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className={`font-bold text-sm mb-1 ${dark ? "text-white" : "text-gray-700"}`}>AI Suggestion</p>
                      <p className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>{scanResult.suggestions}</p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Freshness Score */}
              <GlassCard dark={dark} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`font-black text-xl ${dark ? "text-white" : "text-gray-800"}`}>Fridge Freshness Score</h3>
                    <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Overall health of your fridge</p>
                  </div>
                  <div className={`text-5xl font-black ${scanResult.waste_score >= 70 ? "text-emerald-400" : scanResult.waste_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {scanResult.waste_score}
                    <span className="text-2xl text-gray-400">/100</span>
                  </div>
                </div>
                <div className={`h-3 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${scanResult.waste_score >= 70 ? "bg-emerald-500" : scanResult.waste_score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${scanResult.waste_score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-red-400">Critical</span>
                  <span className="text-xs text-yellow-400">Moderate</span>
                  <span className="text-xs text-emerald-400">Excellent</span>
                </div>
              </GlassCard>

              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {[["bg-red-500", "🔴 Expires in ≤2 days"], ["bg-yellow-500", "🟡 Expires in 3–5 days"], ["bg-emerald-500", "🟢 Fresh (>5 days)"]].map(([bg, label]) => (
                  <div key={label} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${dark ? "bg-white/5 text-gray-300" : "bg-white/70 text-gray-600"} border ${dark ? "border-white/10" : "border-gray-100"}`}>
                    <span className={`w-2 h-2 rounded-full ${bg}`} />
                    {label}
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <h3 className={`font-bold text-lg mb-4 ${dark ? "text-white" : "text-gray-800"}`}>🧊 Detected Food Items ({scanResult.items.length})</h3>
                <FoodItemsGrid items={scanResult.items} dark={dark} />
              </div>

              {/* Recipes */}
              <div>
                <h3 className={`font-bold text-lg mb-4 ${dark ? "text-white" : "text-gray-800"}`}>🍽️ Recipe Suggestions</h3>
                <RecipeCards recipes={scanResult.recipes} dark={dark} />
              </div>
            </div>
          )}

          {activeTab === "analytics" && <AnalyticsSection dark={dark} />}

          {activeTab === "history" && (
            <div>
              <h2 className={`font-black text-2xl mb-6 ${dark ? "text-white" : "text-gray-800"}`}>📂 Scan History</h2>
              <HistorySection history={history} dark={dark} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);

  const handleAuth = (userData) => {
    setUser(userData);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("landing");
  };

  const toggleDark = () => setDark(d => !d);

  if (page === "landing") {
    return <Landing onLogin={() => setPage("auth")} dark={dark} toggleDark={toggleDark} />;
  }

  if (page === "auth") {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onAuth={handleAuth}
        dark={dark}
      />
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} dark={dark} toggleDark={toggleDark} />;
}
