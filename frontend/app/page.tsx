"use client";

import { useState, useEffect } from "react";
import { Filter, TrendingUp, Shield, Loader2, CalendarX2, Sparkles, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PredictionCard from "@/components/PredictionCard";
import TrustSection from "@/components/TrustSection";
import { getActivePredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "2+ ODDS", value: "2+" },
  { label: "5+ ODDS", value: "5+" },
  { label: "10+ ODDS", value: "10+" },
  { label: "20+ ODDS", value: "20+" },
];

export default function HomePage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPredictions("all");
  }, []);

  const fetchPredictions = async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivePredictions(category === "all" ? undefined : category);
      setPredictions(data);
    } catch {
      setError("Failed to load predictions. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    fetchPredictions(value);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen" style={{ background: "var(--bg-base)" }}>
        {/* ── Hero ── */}
        <section className="pt-28 pb-14 relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
          {/* Glow orb */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)" }}
          />

          <div className="page-container text-center relative z-10">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--brand-dim)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand)",
                }}
              >
                <Sparkles size={12} />
                Premium Football Predictions
              </div>
            </div>

            {/* Headline */}
            <h1 className="section-title mb-4">
              This Week&apos;s{" "}
              <span style={{ color: "var(--brand)" }}>
                Featured Tips
              </span>
            </h1>
            <p className="text-base md:text-lg max-w-lg mx-auto mb-12 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Unlock premium predictions with guaranteed odds. Expert analysis, verified results, instant access.
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-14">
              {[
                { icon: <Trophy size={18} />, label: "Win Rate", value: "87%", color: "var(--success)" },
                { icon: <TrendingUp size={18} />, label: "Predictions", value: "500+", color: "var(--brand)" },
                { icon: <Shield size={18} />, label: "Verified", value: "100%", color: "var(--accent)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25)",
                    minWidth: "100px",
                  }}
                >
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: "1.5rem", color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter bar label */}
            <div className="flex items-center justify-center gap-2 text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              <Filter size={14} />
              <span className="font-medium">Filter by odds</span>
            </div>

            {/* Filter pills */}
            <div className="relative">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 md:hidden"
                style={{ background: "linear-gradient(to right, transparent, var(--bg-base))" }} />
              <div className="flex items-center gap-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible
                px-1 pb-1 scroll-smooth
                scrollbar-none [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilter(tab.value)}
                    className={`flex-shrink-0 filter-tab ${activeFilter === tab.value ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section className="pb-20 relative z-10" style={{ background: "var(--bg-base)" }}>
          <div className="page-container pt-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "var(--brand-dim)",
                    border: "1px solid var(--brand-border)",
                  }}
                >
                  <Loader2 size={28} style={{ color: "var(--brand)" }} className="animate-spin" />
                </div>
                <p style={{ color: "var(--text-muted)" }} className="text-sm">Loading predictions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-24">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => fetchPredictions(activeFilter)}
                  className="btn-outline"
                >
                  Try Again
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-24">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <CalendarX2 size={28} style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="text-lg mb-2 font-display font-semibold" style={{ color: "var(--text-primary)" }}>No predictions available</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Check back soon — new tips are being prepared.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {predictions.map((pred, idx) => (
                    <PredictionCard
                      key={pred._id}
                      prediction={pred}
                      animationDelay={idx * 100}
                    />
                  ))}
                </div>

                {/* View History CTA */}
                <div className="text-center mt-14">
                  <a href="/history" className="btn-outline">
                    View Past Results
                  </a>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Trust Section (server component — renders instantly) ── */}
        <TrustSection />
      </main>

      <Footer />
    </>
  );
}
