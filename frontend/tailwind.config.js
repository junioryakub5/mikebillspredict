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
          primary: "#ffffff",
          secondary: "#f7f7f8",
          card: "#ffffff",
        },
        accent: {
          DEFAULT: "#ff3c00",
          light: "#ff6633",
          dark: "#e63500",
          warm: "#ff3c00",
        },
        gold: { DEFAULT: "#ff3c00", light: "#ff6633", dark: "#e63500" },
        amber: "#ff3c00",
        emerald: "#10b981",
        wizard: {
          purple: "#7c3aed",
          "purple-light": "#a78bfa",
          "purple-dark": "#5b21b6",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
        brand: ["Sora", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 4s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.08)",
        accent: "0 4px 16px rgba(255,60,0,0.2)",
        "accent-lg": "0 8px 32px rgba(255,60,0,0.3)",
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
