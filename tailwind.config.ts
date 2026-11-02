const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Flat, sharp-cornered system: every rounded-* utility resolves to 0.
    borderRadius: {
      none: "0",
      DEFAULT: "0",
    },
    extend: {
      colors: {
        obsidian: "#121212",
        surface: "#1c1c1c",
        void: "#0a0a0a",
        line: "#2a2a2a",
        ink: "#f3f4f6",
        muted: "#9ca3af",
        gold: "#d0ab4d",
        skyblue: "#38bdf8",
        babypink: "#ff9cfc",
        electric: "#a855f7",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      letterSpacing: {
        label: "0.14em",
      },
    },
  },
  plugins: [],
};

export default config;
