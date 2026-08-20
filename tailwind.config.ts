import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"League Gothic"', "Impact", "sans-serif"],
        body: ['"Urbanist"', "system-ui", "sans-serif"],
        // duduo signature (economia circular): sora 800 pra headline editorial
        "display-duduo": ['"Sora"', '"League Gothic"', "system-ui", "sans-serif"],
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sebrae: {
          azul: "hsl(var(--sebrae-azul))",
          "azul-escuro": "hsl(var(--sebrae-azul-escuro))",
          "azul-claro": "hsl(var(--sebrae-azul-claro))",
          amarelo: "hsl(var(--sebrae-amarelo))",
          verde: "hsl(var(--sebrae-verde))",
          vermelho: "hsl(var(--sebrae-vermelho))",
          cinza: "hsl(var(--sebrae-cinza))",
          "cinza-claro": "hsl(var(--sebrae-cinza-claro))",
          preto: "hsl(var(--sebrae-preto))",
        },
        // paleta perestroika (primária da marca)
        perestroika: {
          bege: "hsl(var(--brand-bege))",
          laranja: "hsl(var(--brand-laranja))",
          vermelho: "hsl(var(--brand-vermelho))",
          rosa: "hsl(var(--brand-rosa))",
          azul: "hsl(var(--brand-azul))",
          preto: "hsl(var(--brand-preto))",
        },
        // azul institucional NachesU (wordmark + selo)
        "naches-azul": "#1E2BB8",
        "naches-lilas": "#8A85BF",
        // duduo (economia circular): base creme + acento vermelho-laranja + apoios
        duduo: {
          escuro: "#202124",
          creme: "#F5EEE1",
          dourado: "#EFD7A9",
          cinza: "#9AA0A7",
          rosa: "#F2D8DC",
          azul: "#448FF2",
          verde: "#75BF9C",
          amarelo: "#F2BC57",
          laranja: "#F25E3D",
        },
        // alias semântico curto pra paleta perestroika
        brand: {
          bege: "hsl(var(--brand-bege))",
          laranja: "hsl(var(--brand-laranja))",
          vermelho: "hsl(var(--brand-vermelho))",
          rosa: "hsl(var(--brand-rosa))",
          azul: "hsl(var(--brand-azul))",
          preto: "hsl(var(--brand-preto))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-sebrae": "var(--gradient-sebrae)",
        // aliases legados (perestroika)
        "gradient-small": "var(--gradient-primary)",
        "gradient-screen": "var(--gradient-hero)",
      },
      boxShadow: {
        card: "0 2px 0 0 hsl(var(--foreground) / 0.12)",
        lift: "0 6px 0 0 hsl(var(--foreground) / 0.14)",
        float: "0 18px 40px -24px hsl(var(--foreground) / 0.45)",
        glow: "0 10px 30px -12px hsl(var(--primary) / 0.45)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "depth-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.985)", filter: "blur(4px)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        "depth-in-bullets": {
          from: { opacity: "0", transform: "translateX(-10px)", filter: "blur(2px)" },
          to: { opacity: "1", transform: "translateX(0)", filter: "blur(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "fab-ripple": {
          "0%": { transform: "scale(0.85)", opacity: "0.9" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "pill-unlock": {
          "0%": { transform: "translateY(6px) scale(0.99)", opacity: "0.6" },
          "60%": { transform: "translateY(0) scale(1.01)", opacity: "1" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out both",
        "depth-in": "depth-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "depth-in-bullets": "depth-in-bullets 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "spin-slow": "spin-slow 40s linear infinite",
        "fab-ripple": "fab-ripple 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "pill-unlock": "pill-unlock 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 300ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
