/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Deepened teal scale — industrial/medical gas association, professional rather
        // than decorative. `950` added for premium dark-mode accents (badges, gradients).
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2c",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px 0 rgb(0 0 0 / 0.04)",
        "premium-dark": "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 8px 24px -4px rgb(0 0 0 / 0.35)",
        glow: "0 0 0 1px rgb(20 184 166 / 0.15), 0 4px 20px -2px rgb(20 184 166 / 0.25)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
      },
    },
  },
  plugins: [],
};
