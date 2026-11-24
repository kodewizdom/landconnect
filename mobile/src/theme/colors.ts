// LandConnect Luxury Design System — Colour Palette
// Inspired by Sotheby's International Realty private-wealth aesthetic

export const Colors = {
  // ── Core Brand ───────────────────────────────────────────────────────────
  emerald:    '#0B2B26', // Deep Estate Emerald — primary, headers, active tabs
  pine:       '#143D36', // Rich Pine — secondary, pressed / hover states

  // ── Canvas & Cards ───────────────────────────────────────────────────────
  alabaster:  '#F8F7F4', // Warm Alabaster — screen canvas background
  ivory:      '#FFFFFF', // Pure Ivory — elevated cards, modals, inputs

  // ── Accent ───────────────────────────────────────────────────────────────
  gold:       '#C5A059', // Brushed Champagne Gold — prices, active highlights, CTAs
  goldLight:  '#F5EDD8', // Gold tint — pill backgrounds, role chips

  // ── Typography ───────────────────────────────────────────────────────────
  charcoal:   '#181C1B', // Charcoal Ink — primary text
  slate:      '#636B69', // Warm Slate — secondary / caption text
  muted:      '#A0A8A6', // Muted — placeholders, disabled labels

  // ── Borders & Dividers ───────────────────────────────────────────────────
  sand:       '#E6E2D8', // Hairline Sand — borders, dividers, separators

  // ── Semantic Status ──────────────────────────────────────────────────────
  success:    '#1A6B45', // Available / Accept call
  successBg:  '#E8F5EE',
  warning:    '#92610A', // In Negotiation
  warningBg:  '#FEF3C7',
  error:      '#8B1A1A', // Sold / End call / Reject
  errorBg:    '#FEE2E2',

  // ── Utility ──────────────────────────────────────────────────────────────
  transparent: 'transparent',
  overlay:     'rgba(11,43,38,0.92)', // Incoming call modal backdrop
  overlayLight:'rgba(0,0,0,0.45)',    // Filter / bottom sheet backdrop
} as const;

export type ColorKey = keyof typeof Colors;
