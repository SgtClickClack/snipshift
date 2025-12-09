import colors from 'tailwindcss/colors';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navbar: {
          DEFAULT: "hsl(var(--navbar))",
          foreground: "hsl(var(--navbar-foreground))",
        },
        steel: {
          50: "hsl(210, 20%, 98%)",
          100: "hsl(210, 18%, 95%)",
          200: "hsl(210, 15%, 90%)",
          300: "hsl(210, 12%, 82%)",
          400: "hsl(210, 10%, 68%)",
          500: "hsl(210, 8%, 52%)",
          600: "hsl(210, 10%, 38%)",
          700: "hsl(210, 15%, 28%)",
          800: "hsl(210, 18%, 18%)",
          900: "hsl(210, 20%, 12%)",
        },
        'red-accent': {
          DEFAULT: "hsl(0, 85%, 35%)",
          light: "hsl(0, 85%, 45%)",
          hover: "hsl(0, 88%, 40%)",
          dark: "hsl(0, 85%, 30%)",
        },
        chrome: {
          light: "hsl(210, 8%, 95%)",
          medium: "hsl(210, 8%, 68%)",
          dark: "hsl(210, 12%, 45%)",
          accent: "hsl(210, 15%, 85%)",
        },
        page: {
          signup: "hsl(210, 20%, 96%)",
          hub: "hsl(210, 15%, 92%)",
          professional: "hsl(210, 12%, 88%)",
          brand: "hsl(210, 10%, 85%)",
          trainer: "hsl(210, 8%, 82%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      zIndex: {
        // Semantic z-index scale for consistent layering
        base: "0",
        elevated: "10",
        badge: "20",
        sticky: "40",
        floating: "50",
        overlay: "100",
        // Numeric values kept for backward compatibility
        0: "0",
        10: "10",
        20: "20",
        30: "30",
        40: "40",
        50: "50",
        100: "100",
        999: "999",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
