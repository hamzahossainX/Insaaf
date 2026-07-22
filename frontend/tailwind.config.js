/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
<<<<<<< HEAD
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Deepened teal scale — industrial/medical gas association, professional rather
        // than decorative. `950` added for premium dark-mode accents (badges, gradients).
=======
        sans: ["'Plus Jakarta Sans'", "'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Standard Tailwind teal scale — evokes industrial/medical gas, reads as
        // professional rather than decorative. Kept under the `brand` name so it's
        // a single place to retune later.
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
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
<<<<<<< HEAD
          950: "#042f2c",
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
<<<<<<< HEAD
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px 0 rgb(0 0 0 / 0.04)",
        "premium-dark": "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 8px 24px -4px rgb(0 0 0 / 0.35)",
        glow: "0 0 0 1px rgb(20 184 166 / 0.15), 0 4px 20px -2px rgb(20 184 166 / 0.25)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
=======
        "card-hover": "0 8px 24px -6px rgb(13 148 136 / 0.16), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
        glow: "0 0 0 3px rgb(20 184 166 / 0.15)",
        "glow-lg": "0 8px 30px -4px rgb(13 148 136 / 0.35)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0d9488 0%, #14b8a6 45%, #2dd4bf 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(45,212,191,0.05) 100%)",
        "mesh-light": "radial-gradient(at 0% 0%, rgba(20,184,166,0.10) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(56,189,248,0.10) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(20,184,166,0.08) 0px, transparent 50%)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.96)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        slideInLeft: {
          "0%": { opacity: 0, transform: "translateX(-8px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(20,184,166,0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(20,184,166,0)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "fade-in-up": "fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-left": "slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.2s ease-in-out infinite",
        "spin-slow": "spinSlow 6s linear infinite",
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
      },
    },
  },
  plugins: [],
};
