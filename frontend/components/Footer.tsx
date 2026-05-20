import { TrendingUp, Shield, Zap, BarChart2 } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home",    href: "/" },
  { label: "History", href: "/history" },
];

const TRUST_ITEMS = [
  { icon: Shield,   label: "Verified Picks" },
  { icon: Zap,      label: "Instant Access" },
  { icon: BarChart2,label: "Expert Analysis" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {/* ── Main grid ── */}
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--brand-dim)", border: "1px solid var(--brand-border)" }}
              >
                <TrendingUp size={15} style={{ color: "var(--brand)" }} />
              </div>
              <span className="font-brand text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Mike Bills<span style={{ color: "var(--brand)" }}> Predict</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", maxWidth: "260px" }}>
              Premium football predictions backed by deep match research and expert analysis.
            </p>
          </div>

          {/* Navigation column */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Navigation
            </p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--brand)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust column */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Why Us
            </p>
            <ul className="space-y-2.5">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon size={13} style={{ color: "var(--brand)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Full-width divider + copyright ── */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="page-container py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {year} Mike Bills Predict. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Bet responsibly · 18+ only
          </p>
        </div>
      </div>
    </footer>
  );
}
