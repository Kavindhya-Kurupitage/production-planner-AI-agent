import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      colors: {
        accent: "#F5C518",
        "accent-dim": "#2a2400",
        "bg-surface": "#111111",
        "bg-elevated": "#141414",
        "border-subtle": "#1e1e1e",
        danger: "#ff4444",
        warning: "#ff6b35",
        success: "#22c55e"
      },
      boxShadow: {
        panel: "0 8px 32px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
