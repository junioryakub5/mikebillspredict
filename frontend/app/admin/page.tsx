"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, BookOpen, CreditCard, LogOut, Plus, Pencil, Trash2,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, TrendingUp, DollarSign,
  FileText, Activity, ChevronLeft, ChevronRight, X, Upload, Search,
  Zap, Globe2, BarChart2, Inbox, Menu,
} from "lucide-react";
import {
  adminGetPredictions, adminCreatePrediction, adminUpdatePrediction,
  adminDeletePrediction, adminGetStats, adminGetPayments, adminUploadImage,
} from "@/lib/api";
import { Prediction, RecentActivity, PaymentRecord } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const ODDS_CATEGORIES = ["2+ ODDS", "5+ ODDS", "10+ ODDS", "20+ ODDS"] as const;
const ODDS_VALUES: Record<string, string> = {
  "2+ ODDS": "2+", "5+ ODDS": "5+", "10+ ODDS": "10+", "20+ ODDS": "20+",
};
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  match: "", league: "", odds: "", oddsCategory: "2+",
  price: 25, content: "", bookingCode: "", tips: "", imageUrl: "", proofImageUrl: "",
  date: new Date().toISOString().split("T")[0],
  status: "active" as "active" | "completed", result: null as "win" | "loss" | null,
  startDay: "", endDay: "",
};

type Section = "overview" | "slips" | "payments";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    win: "bg-emerald-100 text-emerald-700 border-emerald-200",
    loss: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colors[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status}
    </span>
  );
}

function OddsBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "2+": "text-orange-600", "5+": "text-amber-400",
    "10+": "text-violet-400", "20+": "text-red-400",
  };
  return <span className={`font-bold ${colors[cat] ?? "text-orange-600"}`}>{cat}</span>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        <ChevronLeft size={15} /> Previous
      </button>
      <span className="text-sm text-gray-500">Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) { setError("Please enter the admin token."); return; }
    setLoading(true); setError("");
    try {
      await adminGetPredictions(token.trim());
      sessionStorage.setItem("bt_admin_token", token.trim());
      onLogin(token.trim());
    } catch {
      setError("Invalid admin token. Access denied.");
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "#ffffff",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <span className="block mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: "rgba(255,60,0,0.06)",
                border: "1px solid rgba(255,60,0,0.12)",
              }}
            >
              <Zap size={28} style={{ color: "#ff3c00" }} strokeWidth={2} />
            </div>
          </span>
          <h1
            className="mb-1"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "2rem",
              letterSpacing: "-0.03em",
              color: "#111827",
            }}
          >
            Admin{" "}
            <span style={{ background: "linear-gradient(135deg, #ff3c00, #ff6633)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Access
            </span>
          </h1>
          <p className="text-sm" style={{ color: "#9ca3af" }}>Enter your admin token to continue</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 rounded-2xl"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "rgba(255,60,0,0.6)", fontFamily: "'Sora', sans-serif" }}
            >
              Admin Token
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Enter admin token..."
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 pr-10"
                style={{
                  background: "#ffffff",
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  caretColor: "#ff3c00",
                  color: "#111827",
                }}
                onFocus={e => { e.target.style.borderColor = "#ff3c00"; e.target.style.boxShadow = "0 0 0 3px rgba(255,60,0,0.08)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#9ca3af" }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "#ff3c00")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9ca3af")}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <XCircle size={14} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.97]"
            style={{
              background: loading ? "rgba(255,60,0,0.4)" : "#ff3c00",
              color: "#ffffff",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              letterSpacing: "0.02em",
              boxShadow: loading ? "none" : "0 4px 16px rgba(255,60,0,0.25)",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          BoomTips25 · Admin Portal
        </p>
      </div>
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    totalSlips: number; activeSlips: number; completedSlips: number;
    totalRevenue: number; totalSales: number; recentActivity: RecentActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats(token).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin" style={{ color: "#ff3c00" }} />
    </div>
  );
  if (!stats) return <div className="text-gray-500 py-24 text-center">Failed to load stats.</div>;

  const statCards = [
    { label: "Total Slips", value: stats.totalSlips, icon: FileText, color: "text-orange-600" },
    { label: "Active Slips", value: stats.activeSlips, icon: Activity, color: "text-emerald-600" },
    { label: "Total Revenue", value: `GHS ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", wide: true },
    { label: "Total Sales", value: stats.totalSales, icon: TrendingUp, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map(s => (
          <div key={s.label} className="admin-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">{s.label}</span>
              <s.icon size={20} className={s.color} />
            </div>
            <div style={{ color: "#111827" }} className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe2 size={18} className="text-green-400" />
              <h3 style={{ color: "#111827" }} className="font-semibold">Ghana Payments</h3>
            </div>
            <DollarSign size={18} className="text-green-400" />
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Revenue:</span>
            <span className="text-green-400 font-bold">GHS {stats.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Sales:</span>
            <span style={{ color: "#111827" }} className="font-semibold">{stats.totalSales}</span>
          </div>
        </div>
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} style={{ color: "#ff3c00" }} />
              <h3 style={{ color: "#111827" }} className="font-semibold">Slip Overview</h3>
            </div>
            <FileText size={18} style={{ color: "#ff3c00" }} />
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Active:</span>
            <span style={{ color: "#ff3c00" }} className="font-bold">{stats.activeSlips}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Completed:</span>
            <span className="text-gray-600 font-semibold">{stats.completedSlips}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 style={{ color: "#111827" }} className="font-semibold">Recent Activity</h3>
        </div>
        {stats.recentActivity.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No payment activity yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentActivity.map(act => (
              <div key={act._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                    {act.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "#374151" }} className="text-sm font-medium">{act.email}</p>
                    <p className="text-gray-400 text-xs">{act.predictionTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${act.status === "success" ? "text-green-400" : "text-red-400"}`}>
                    {act.currency} {act.amount}
                  </p>
                  <p className="text-gray-400 text-xs">{act.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slip Form Modal ──────────────────────────────────────────────────────────
function SlipModal({
  editing, initial, onSave, onClose, saving, token,
}: {
  editing: Prediction | null;
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving: boolean;
  token: string;
}) {
  const [form, setForm] = useState(initial);
  const [imgPreview, setImgPreview]       = useState(initial.imageUrl || "");
  const [proofPreview, setProofPreview]   = useState(initial.proofImageUrl || "");
  const [uploading, setUploading]         = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileRef      = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
  };

  const [imgUploadError, setImgUploadError]     = useState("");
  const [proofUploadError, setProofUploadError] = useState("");

  // Upload slip image to Supabase storage
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploadError("");
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    setUploading(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setImgPreview(cdnUrl);
      setForm(prev => ({ ...prev, imageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setImgUploadError(msg);
      setImgPreview("");
      setForm(prev => ({ ...prev, imageUrl: "" }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Upload proof image to Supabase storage
  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofUploadError("");
    const localUrl = URL.createObjectURL(file);
    setProofPreview(localUrl);
    setUploadingProof(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setProofPreview(cdnUrl);
      setForm(prev => ({ ...prev, proofImageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setProofUploadError(msg);
      setProofPreview("");
      setForm(prev => ({ ...prev, proofImageUrl: "" }));
    } finally {
      setUploadingProof(false);
      if (proofFileRef.current) proofFileRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 style={{ color: "#111827" }} className="font-bold text-lg">{editing ? "Edit Slip" : "Add New Slip"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="admin-label">Title *</label>
            <input name="match" value={form.match} onChange={onChange}
              placeholder="e.g. Arsenal vs Chelsea" className="admin-input" required />
          </div>

          {/* Odds Category */}
          <div>
            <label className="admin-label">Odds Category</label>
            <select name="oddsCategory" value={
              ODDS_CATEGORIES.find(c => ODDS_VALUES[c] === form.oddsCategory) || "2+ ODDS"
            }
              onChange={e => setForm(prev => ({ ...prev, oddsCategory: ODDS_VALUES[e.target.value] }))}
              className="admin-select">
              {ODDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="admin-label">Price (GHS)</label>
            <input name="price" type="number" value={form.price} onChange={onChange}
              min={1} className="admin-input" required />
          </div>

          {/* League + Odds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">League</label>
              <input name="league" value={form.league} onChange={onChange}
                placeholder="Premier League" className="admin-input" />
            </div>
            <div>
              <label className="admin-label">Odds (display)</label>
              <input name="odds" value={form.odds} onChange={onChange}
                placeholder="7.50" className="admin-input" />
            </div>
          </div>

          {/* Start / End Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Start Day</label>
              <input name="startDay" value={form.startDay} onChange={onChange}
                placeholder="e.g. Saturday" className="admin-input" />
            </div>
            <div>
              <label className="admin-label">End Day</label>
              <input name="endDay" value={form.endDay} onChange={onChange}
                placeholder="e.g. Sunday" className="admin-input" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="admin-label">Date *</label>
            <input name="date" type="date" value={form.date} onChange={onChange}
              className="admin-input" required />
          </div>

          {/* Status + Result */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Status</label>
              <select name="status" value={form.status} onChange={onChange} className="admin-select">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {form.status === "completed" && (
              <div>
                <label className="admin-label">Result</label>
                <select name="result" value={form.result ?? ""} onChange={e => setForm(prev => ({ ...prev, result: e.target.value as "win" | "loss" | null || null }))} className="admin-select">
                  <option value="">— Not set —</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                </select>
              </div>
            )}
          </div>

          {/* Booking content */}
          <div>
            <label className="admin-label">Prediction / Booking Code</label>
            <textarea name="content" value={form.content} onChange={onChange}
              rows={2} placeholder="Short summary: Arsenal to Win & Over 2.5 Goals"
              className="admin-input resize-y min-h-[60px]" />
          </div>

          {/* Booking code */}
          <div>
            <label className="admin-label">Betting Code (shown prominently when unlocked)</label>
            <input name="bookingCode" value={form.bookingCode} onChange={onChange}
              placeholder="e.g. ARS-CHE-8821" className="admin-input font-mono" />
          </div>

          {/* Tips list */}
          <div>
            <label className="admin-label">Tips (one per line)</label>
            <textarea name="tips" value={form.tips} onChange={onChange}
              rows={3} placeholder={"Arsenal to win\nBoth teams to score\nOver 2.5 goals total"}
              className="admin-input resize-y min-h-[80px] text-xs" />
          </div>

          {/* Bet Slip Image (before) */}
          <div>
            <label className="admin-label">Bet Slip Image <span className="text-gray-400 font-normal">(shown blurred before payment)</span></label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="admin-btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                <Upload size={14} /> {uploading ? "Uploading…" : "Choose Image"}
              </button>
              <span className="text-gray-500 text-sm">
                {uploading ? "Uploading to storage…" : imgPreview && !imgUploadError ? "✅ Uploaded" : "No image chosen"}
              </span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFile} />
            </div>
            {imgUploadError && (
              <p className="mt-2 text-red-400 text-xs">❌ Upload failed: {imgUploadError}</p>
            )}
            {imgPreview && !imgUploadError && (
              <div className="mt-3 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="Slip preview" className="h-28 rounded-xl object-cover border border-gray-200" />
                <button type="button" onClick={() => { setImgPreview(""); setImgUploadError(""); setForm(p => ({ ...p, imageUrl: "" })); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Proof Image — only shown when marking completed */}
          {form.status === "completed" && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <label className="admin-label text-emerald-600 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                Proof Image <span className="text-gray-500 font-normal">(result screenshot shown in History)</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => proofFileRef.current?.click()} disabled={uploadingProof}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
                  <Upload size={14} /> {uploadingProof ? "Uploading…" : "Upload Proof Image"}
                </button>
                <span className="text-gray-500 text-sm">
                  {uploadingProof ? "Uploading…" : proofPreview && !proofUploadError ? "✅ Uploaded" : "No proof yet"}
                </span>
                <input ref={proofFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onProofFile} />
              </div>
              {proofUploadError && (
                <p className="text-red-400 text-xs">❌ Upload failed: {proofUploadError}</p>
              )}
              {proofPreview && !proofUploadError && (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofPreview} alt="Proof preview" className="h-28 rounded-xl object-cover border border-emerald-300" />
                  <button type="button" onClick={() => { setProofPreview(""); setProofUploadError(""); setForm(p => ({ ...p, proofImageUrl: "" })); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="admin-btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? "Saving..." : editing ? "Update Slip" : "Create Slip"}
            </button>
            <button type="button" onClick={onClose} className="admin-btn-ghost flex-none px-6">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Slips Section ─────────────────────────────────────────────────────
function ManageSlipsSection({ token }: { token: string }) {
  const [slips, setSlips] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setSlips(await adminGetPredictions(token)); }
    catch { showToast("err", "Failed to load slips."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = slips.filter(s =>
    s.match.toLowerCase().includes(search.toLowerCase()) ||
    (s.league || "").toLowerCase().includes(search.toLowerCase())
  );
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const payload: Partial<Prediction> = {
        match: form.match, league: form.league, odds: form.odds,
        oddsCategory: form.oddsCategory as "2+" | "5+" | "10+" | "20+",
        price: form.price,
        content: form.content,
        bookingCode: form.bookingCode,
        tips: form.tips ? (form.tips as string).split("\n").map((t: string) => t.trim()).filter(Boolean) : [],
        imageUrl: form.imageUrl,
        proofImageUrl: form.proofImageUrl,
        date: form.date,
        status: form.status, result: form.result,
        startDay: form.startDay, endDay: form.endDay,
      };
      if (editing) { await adminUpdatePrediction(token, editing._id, payload); showToast("ok", "Slip updated!"); }
      else { await adminCreatePrediction(token, payload); showToast("ok", "Slip created!"); }
      setShowModal(false); setEditing(null);
      await load();
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast("err", serverMsg || "Failed to save. Check console for details.");
      console.error("Save prediction error:", err);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await adminDeletePrediction(token, id);
      showToast("ok", "Slip deleted.");
      setDeleteId(null);
      await load();
    } catch { showToast("err", "Failed to delete."); }
    finally { setSaving(false); }
  };

  const openEdit = (slip: Prediction) => {
    setEditing(slip);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === "ok" ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" : "bg-red-500/20 border border-red-500/40 text-red-300"}`}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search slips..." className="admin-input pl-9 text-sm" />
        </div>
        <button onClick={openCreate} className="admin-btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New Slip
        </button>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin" style={{ color: "#ff3c00" }} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <Inbox size={22} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No slips found.</p>
            <button onClick={openCreate} className="admin-btn-primary mt-4">Create First Slip</button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-700/30">
              {paginated.map(slip => (
                <div key={slip._id} className="px-4 py-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "#111827" }} className="text-sm font-semibold truncate">{slip.match}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <OddsBadge cat={slip.oddsCategory} />
                      <span className="text-gray-500 text-xs">GHS {slip.price}</span>
                      <StatusBadge status={slip.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(slip)} title="Edit"
                      className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                      <Pencil size={15} />
                    </button>
                    {deleteId === slip._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(slip._id)} disabled={saving}
                          className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg">
                          {saving ? "..." : "Del"}
                        </button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 text-gray-400 rounded-lg"><X size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(slip._id)} title="Delete"
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Title", "Odds", "Price", "Status", "Purchases", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {paginated.map(slip => (
                    <tr key={slip._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium max-w-[220px] truncate">{slip.match}</td>
                      <td className="px-5 py-4"><OddsBadge cat={slip.oddsCategory} /></td>
                      <td className="px-5 py-4 text-gray-600 text-sm">GHS {slip.price}</td>
                      <td className="px-5 py-4"><StatusBadge status={slip.status} /></td>
                      <td className="px-5 py-4 text-gray-500 text-sm">0</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(slip)} title="Edit"
                            className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                            <Pencil size={15} />
                          </button>
                          {deleteId === slip._id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(slip._id)} disabled={saving}
                                className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg hover:bg-red-500/10">
                                {saving ? "..." : "Confirm"}
                              </button>
                              <button onClick={() => setDeleteId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X size={13} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteId(slip._id)} title="Delete"
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 md:px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} slips
            </div>
          </>
        )}
      </div>

      <Pagination page={page} pages={pages} onPage={setPage} />

      {/* Modal */}
      {showModal && (
        <SlipModal
          editing={editing}
          initial={editing ? {
            match: editing.match, league: editing.league || "", odds: editing.odds,
            oddsCategory: editing.oddsCategory, price: editing.price,
            content: editing.content || "", bookingCode: (editing as {bookingCode?: string}).bookingCode || "",
            tips: ((editing as {tips?: string[]}).tips || []).join("\n"),
            imageUrl: editing.imageUrl || "",
            proofImageUrl: editing.proofImageUrl || "",
            date: new Date(editing.date).toISOString().split("T")[0],
            status: editing.status, result: editing.result,
            startDay: "", endDay: "",
          } : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          saving={saving}
          token={token}
        />
      )}
    </>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────
function PaymentsSection({ token }: { token: string }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminGetPayments(token, p);
      setPayments(res.data); setTotal(res.total); setPages(res.pages);
    } catch { console.error("Failed to load payments"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(page); }, [load, page]);

  const filtered = payments.filter(p =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.predictionTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search payments..." className="admin-input pl-9 text-sm" />
        </div>
        <div className="text-gray-500 text-sm">{total} total transactions</div>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin" style={{ color: "#ff3c00" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No payments found.</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-700/30">
              {filtered.map(pmt => (
                <div key={pmt._id} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700 flex-shrink-0">
                        {pmt.email[0].toUpperCase()}
                      </div>
                      <span className="text-gray-700 text-sm truncate max-w-[160px]">{pmt.email}</span>
                    </div>
                    <span className={`font-bold text-sm ${pmt.status === "success" ? "text-green-400" : "text-red-400"}`}>
                      {pmt.currency} {pmt.amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-9">
                    <StatusBadge status={pmt.status} />
                    <span className="text-gray-400 text-xs truncate">{pmt.predictionTitle}</span>
                    <span className="text-gray-400 text-xs ml-auto">{new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Customer", "Slip", "Reference", "Amount", "Status", "Date"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filtered.map(pmt => (
                    <tr key={pmt._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                            {pmt.email[0].toUpperCase()}
                          </div>
                          <span className="text-gray-700 text-sm">{pmt.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-sm max-w-[160px] truncate">{pmt.predictionTitle}</td>
                      <td className="px-5 py-4 text-gray-400 text-xs font-mono">{pmt.reference}</td>
                      <td className="px-5 py-4">
                        <span className={`font-bold text-sm ${pmt.status === "success" ? "text-green-400" : "text-red-400"}`}>
                          {pmt.currency} {pmt.amount}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={pmt.status} /></td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 md:px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
              {total} total payments
            </div>
          </>
        )}
      </div>

      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p); }} />
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    { id: "slips"    as Section, label: "Manage Slips", icon: BookOpen },
    { id: "payments" as Section, label: "Payments", icon: CreditCard },
  ];

  const sectionTitle: Record<Section, string> = {
    overview: "Dashboard Overview",
    slips: "Manage Slips",
    payments: "Payments",
  };

  const goTo = (id: Section) => { setSection(id); setDrawerOpen(false); };

  // Sidebar nav content — shared between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", color: "#111827" }}>
            Boom<span style={{ color: "#ff3c00" }}>Tips25</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#9ca3af", fontFamily: "'Sora', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin Panel</div>
        </div>
        {/* Close button — only visible in drawer */}
        <button
          className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
          onClick={() => setDrawerOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => goTo(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
            style={section === item.id ? {
              background: "rgba(255,60,0,0.06)",
              color: "#ff3c00",
              border: "1px solid rgba(255,60,0,0.12)",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
            } : {
              color: "#9ca3af",
              border: "1px solid transparent",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "#9ca3af", fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "0.02em", border: "1px solid transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.05)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#f7f7f8" }}>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#ffffff", borderRight: "1px solid rgba(0,0,0,0.06)" }}
      >
        <SidebarContent />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col"
        style={{ background: "#ffffff", borderRight: "1px solid rgba(0,0,0,0.06)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: "rgba(255,255,255,0.95)", borderBottom: "1px solid rgba(0,0,0,0.06)", backdropFilter: "saturate(180%) blur(20px)" }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", color: "#111827" }}>
            Boom<span style={{ color: "#ff3c00" }}>Tips25</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="px-4 md:px-8 py-5 md:py-7 max-w-6xl">
            <h1
              className="mb-5 md:mb-6"
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "clamp(1.3rem,4vw,1.8rem)", letterSpacing: "-0.03em", color: "#111827" }}
            >
              {sectionTitle[section]}
            </h1>
            {section === "overview"  && <OverviewSection token={token} />}
            {section === "slips"     && <ManageSlipsSection token={token} />}
            {section === "payments"  && <PaymentsSection token={token} />}
          </div>
        </main>

        {/* ── Mobile bottom tab bar ── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
          style={{ background: "rgba(255,255,255,0.97)", borderTop: "1px solid rgba(0,0,0,0.06)", backdropFilter: "saturate(180%) blur(20px)" }}
        >
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
              style={{ color: section === item.id ? "#ff3c00" : "#9ca3af" }}
            >
              <item.icon size={20} />
              <span style={{ fontSize: "10px", fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {item.label === "Manage Slips" ? "Slips" : item.label}
              </span>
              {section === item.id && (
                <div className="absolute bottom-0 h-0.5 w-10 rounded-full" style={{ background: "#ff3c00" }} />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}


// ─── Page Root ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("bt_admin_token");
    if (saved) setToken(saved);
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen bg-admin-bg" />;

  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => {
    setToken("");
    sessionStorage.removeItem("bt_admin_token");
    window.location.href = "/";
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
