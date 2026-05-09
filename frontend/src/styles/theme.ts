export const theme = {
  colors: {
    primary: "#F5C518",
    secondary: "#2a2400",
    success: "#22c55e",
    warning: "#ff6b35",
    danger: "#ff4444",
    background: "#0a0a0a",
    surface: "#111111",
    text: "#ffffff"
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem"
  },
  shadow: {
    card: "0 8px 32px rgba(0, 0, 0, 0.35)"
  }
} as const;

export type Theme = typeof theme;
