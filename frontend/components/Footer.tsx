import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="relative py-12 text-center"
      style={{
        background: "#f7f7f8",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="page-container relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(255,60,0,0.08)",
              border: "1px solid rgba(255,60,0,0.12)",
            }}
          >
            <Zap size={13} style={{ color: "#ff3c00" }} />
          </div>
          <span className="font-brand text-lg font-bold" style={{ color: "#111827" }}>
            Boom<span style={{ color: "#ff3c00" }}>Tips25</span>
          </span>
        </div>
        <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
          Premium football predictions for smart bettors
        </p>
        <p className="text-xs" style={{ color: "#d1d5db" }}>
          © {new Date().getFullYear()} BoomTips25. All rights reserved.
        </p>
        <p className="text-xs mt-2" style={{ color: "#d1d5db" }}>
          Bet responsibly. 18+ only.
        </p>
      </div>
    </footer>
  );
}
