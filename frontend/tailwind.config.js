/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "#080c14",
          surface: "#0d1220",
          card:    "#111827",
          elevated:"#16213a",
        },
        brand: {
          DEFAULT: "#6366f1",
          dim:     "rgba(99,102,241,0.12)",
          border:  "rgba(99,102,241,0.25)",
          glow:    "rgba(99,102,241,0.35)",
          dark:    "#4f52e8",
        },
        accent: {
          DEFAULT: "#eab308",
          dim:     "rgba(234,179,8,0.10)",
          border:  "rgba(234,179,8,0.25)",
        },
        success: {
          DEFAULT: "#22d3ee",
          dim:     "rgba(34,211,238,0.08)",
        },
        text: {
          primary:   "#f1f5f9",
          secondary: "#94a3b8",
          muted:     "#475569",
        },
      },
      fontFamily: {
        sans:    ["DM Sans",  "system-ui", "sans-serif"],
        display: ["Sora",     "sans-serif"],
        brand:   ["Sora",     "sans-serif"],
        headline:["Sora",     "sans-serif"],
      },
      animation: {
        "fade-up":      "fadeUp 0.45s ease forwards",
        "pulse-soft":   "pulseSoft 2s ease-in-out infinite",
        shimmer:        "shimmer 4s ease-in-out infinite",
        float:          "float 4s ease-in-out infinite",
        "glow-pulse":   "glowPulse 3s ease-in-out infinite",
        "fade-in-up":   "fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(28px) scale(0.98)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.55" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 16px rgba(99,102,241,0.2)" },
          "50%":      { boxShadow: "0 0 32px rgba(99,102,241,0.4)" },
        },
      },
      boxShadow: {
        card:         "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.35)",
        brand:        "0 0 24px rgba(99,102,241,0.25)",
        "brand-lg":   "0 4px 24px rgba(99,102,241,0.35)",
        accent:       "0 4px 20px rgba(234,179,8,0.2)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
