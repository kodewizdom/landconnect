// LandConnect Luxury Design System — Typography Scale & INR Formatter

import { StyleSheet } from 'react-native';
import { Colors } from './colors';

// ── Font Scale ──────────────────────────────────────────────────────────────

export const Typography = StyleSheet.create({
  /** ALL-CAPS tracked eyebrow — section labels, role badges */
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.slate,
  },

  /** Hero screen / modal headline */
  heading1: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.charcoal,
  },

  /** Card title / section header */
  heading2: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.charcoal,
  },

  /** Sub-header */
  heading3: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    color: Colors.charcoal,
  },

  /** Standard body copy */
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
    color: Colors.charcoal,
  },

  /** Captions, timestamps, helper text */
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.1,
    color: Colors.slate,
  },

  /** INR price display — tabular, prominent */
  price: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.emerald,
  },
});

// ── INR Formatter ───────────────────────────────────────────────────────────

/**
 * Formats a numeric INR amount into human-readable Lakh / Cr notation.
 * Examples:
 *   45_00_000  → ₹45.00 Lakh
 *   1_20_00_000 → ₹1.20 Cr
 *   95_000      → ₹95,000
 */
export const formatINR = (value: number): string => {
  if (!value && value !== 0) return '—';
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000)    return `₹${(value / 100_000).toFixed(2)} Lakh`;
  return `₹${value.toLocaleString('en-IN')}`;
};

// ── Shadow Preset ───────────────────────────────────────────────────────────

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
} as const;

// ── Spacing & Radii ─────────────────────────────────────────────────────────

export const Radii = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 999,
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
} as const;
