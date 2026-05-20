// Server component — renders at build/request time, no hydration delay
import { BarChart2, ShieldCheck, Zap } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: BarChart2,
    title: "Expert Analysis",
    desc: "Statistic-driven predictions backed by deep match research",
    color: "var(--brand)",
    bg: "var(--brand-dim)",
    border: "var(--brand-border)",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    desc: "Paystack-powered payments — safe and instant",
    color: "var(--success)",
    bg: "var(--success-dim)",
    border: "rgba(34,211,238,0.15)",
  },
  {
    icon: Zap,
    title: "Instant Access",
    desc: "Unlock your prediction immediately after payment",
    color: "var(--accent)",
    bg: "var(--accent-dim)",
    border: "var(--accent-border)",
  },
];

export default function TrustSection() {
  return (
    <section
      className="py-10 md:py-20 relative z-10"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="page-container text-center">
        <h2
          className="font-display font-bold mb-2 md:mb-3"
          style={{
            fontSize: "clamp(1.4rem,5vw,2.8rem)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
          }}
        >
          Why Trust{" "}
          <span style={{ color: "var(--brand)" }}>Mike Bills Predict?</span>
        </h2>
        <p
          className="text-xs md:text-sm max-w-md mx-auto mb-6 md:mb-14 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Expert-verified predictions. Secure payments via Paystack. Instant access.
        </p>

        <div className="grid grid-cols-3 gap-2 md:gap-5 max-w-4xl mx-auto">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center p-3 md:p-7 rounded-xl md:rounded-2xl transition-transform duration-300 hover:-translate-y-1 md:hover:-translate-y-2 group"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25)",
              }}
            >
              <div
                className="w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  color: item.color,
                }}
              >
                <item.icon size={20} />
              </div>
              <div className="min-w-0">
                <h3
                  className="font-display font-bold text-[11px] md:text-sm mb-0.5 md:mb-2 tracking-wide"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-[10px] md:text-xs leading-relaxed hidden md:block"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
